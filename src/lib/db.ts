import "server-only";
import path from "node:path";
import fs from "node:fs";
import { AsyncLocalStorage } from "node:async_hooks";
import type { DatabaseSync } from "node:sqlite";
import type { Pool, PoolClient } from "pg";
import { SCHEMA, MIGRATIONS } from "./schema";
import { bootstrap } from "./seed";

/**
 * Data layer with two interchangeable drivers:
 *  - PostgreSQL  → set DATABASE_URL=postgres://…  (production)
 *  - SQLite      → default, zero-setup file at data/nuqa.db (development / small single-server installs)
 *
 * SQL is written once in a portable dialect ("?" placeholders); the Postgres driver translates it.
 * All functions are async. `tx()` runs a callback in a transaction; queries made inside it (anywhere in
 * the call stack) automatically use the transaction connection.
 */

type Row = Record<string, any>;
type Driver = {
  kind: "postgres" | "sqlite";
  query(sql: string, params: any[], ctx?: any): Promise<{ rows: Row[]; changes: number }>;
  begin(): Promise<any>;
  commit(ctx: any): Promise<void>;
  rollback(ctx: any): Promise<void>;
};

const g = globalThis as unknown as { __nuqaDb?: Promise<Driver> };
const txStore = new AsyncLocalStorage<{ ctx: any }>();

export const dialect = () => (process.env.DATABASE_URL ? "postgres" : "sqlite");

// ------------------------------------------------------------------ postgres

function toPg(sql: string) {
  let i = 0;
  return sql
    .replace(/\?/g, () => `$${++i}`)
    .replace(/\bGROUP_CONCAT\(DISTINCT ([^)]+)\)/gi, "string_agg(DISTINCT CAST($1 AS TEXT), ',')")
    .replace(/\sLIKE\s/g, " ILIKE ");
}

async function postgresDriver(): Promise<Driver> {
  const pg = await import("pg");
  const { Pool, types } = (pg as any).default || pg;
  types.setTypeParser(20, (v: string) => parseInt(v, 10)); // int8 (COUNT/SUM of ints)
  types.setTypeParser(1700, (v: string) => parseFloat(v)); // numeric (AVG/ROUND)
  const pool: Pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: Number(process.env.DB_POOL_MAX || 10),
    ssl: process.env.DATABASE_SSL === "1" ? { rejectUnauthorized: process.env.DATABASE_SSL_STRICT !== "0" } : undefined,
  });
  return {
    kind: "postgres",
    async query(sql, params, ctx?: PoolClient) {
      const r = await (ctx || pool).query(toPg(sql), params);
      return { rows: r.rows, changes: r.rowCount || 0 };
    },
    async begin() {
      const c = await pool.connect();
      await c.query("BEGIN");
      return c;
    },
    async commit(c: PoolClient) {
      try {
        await c.query("COMMIT");
      } finally {
        c.release();
      }
    },
    async rollback(c: PoolClient) {
      try {
        await c.query("ROLLBACK");
      } finally {
        c.release();
      }
    },
  };
}

// ------------------------------------------------------------------ sqlite

function sqliteDriver(): Driver {
  const { DatabaseSync } = process.getBuiltinModule("node:sqlite") as typeof import("node:sqlite");
  const dir = path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  const conn: DatabaseSync = new DatabaseSync(process.env.DATABASE_FILE || path.join(dir, "nuqa.db"));
  conn.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  // A single connection is shared, so transactions are serialized with a lock and queries from
  // other requests wait until the open transaction finishes.
  let lock: Promise<void> = Promise.resolve();
  let release: (() => void) | null = null;
  return {
    kind: "sqlite",
    async query(sql, params, ctx) {
      if (!ctx && release) await lock;
      const st = conn.prepare(sql);
      const isRead = /^\s*(SELECT|WITH|PRAGMA)/i.test(sql) || /\bRETURNING\b/i.test(sql);
      if (isRead) return { rows: (st.all(...params) as Row[]).map((r) => ({ ...r })), changes: 0 };
      const r = st.run(...params);
      return { rows: [], changes: Number(r.changes) };
    },
    async begin() {
      while (release) await lock;
      lock = new Promise<void>((res) => (release = res));
      conn.exec("BEGIN");
      return { sqlite: true };
    },
    async commit() {
      conn.exec("COMMIT");
      const r = release;
      release = null;
      r?.();
    },
    async rollback() {
      try {
        conn.exec("ROLLBACK");
      } finally {
        const r = release;
        release = null;
        r?.();
      }
    },
  };
}

// ------------------------------------------------------------------ init

async function init(): Promise<Driver> {
  const d = dialect() === "postgres" ? await postgresDriver() : sqliteDriver();
  for (const stmt of SCHEMA(d.kind)) await d.query(stmt, []);
  for (const stmt of MIGRATIONS(d.kind)) {
    try {
      await d.query(stmt, []);
    } catch (e: any) {
      // SQLite has no "ADD COLUMN IF NOT EXISTS": ignore duplicate-column errors
      if (!/duplicate column/i.test(String(e?.message))) throw e;
    }
  }
  return d;
}

let booted: Promise<void> | null = null;

async function driver(): Promise<Driver> {
  if (!g.__nuqaDb) g.__nuqaDb = init();
  const d = await g.__nuqaDb;
  if (!booted) {
    booted = bootstrapping.run(true, () => bootstrap()).catch((e) => {
      booted = null;
      throw e;
    });
  }
  // the bootstrap itself runs queries; don't wait on our own promise from inside it
  if (!bootstrapping.getStore()) await booted;
  return d;
}

export const bootstrapping = new AsyncLocalStorage<boolean>();

async function execSql(sql: string, params: any[]) {
  const d = await driver();
  return d.query(sql, params.map((p) => (p === undefined ? null : typeof p === "boolean" ? (p ? 1 : 0) : p)), txStore.getStore()?.ctx);
}

// ------------------------------------------------------------------ public API

export async function all<T = Row>(sql: string, ...params: any[]): Promise<T[]> {
  return (await execSql(sql, params)).rows as T[];
}

export async function get<T = Row>(sql: string, ...params: any[]): Promise<T | undefined> {
  return (await execSql(sql, params)).rows[0] as T | undefined;
}

/** UPDATE / DELETE / statements without a generated id */
export async function run(sql: string, ...params: any[]): Promise<{ changes: number }> {
  return { changes: (await execSql(sql, params)).changes };
}

/** INSERT into a table with an `id` primary key; returns the new id. */
export async function insert(sql: string, ...params: any[]): Promise<number> {
  const r = await execSql(`${sql} RETURNING id`, params);
  return Number(r.rows[0]?.id);
}

/** Run `fn` in a transaction. Re-entrant: nested calls join the outer transaction. */
export async function tx<T>(fn: () => Promise<T>): Promise<T> {
  if (txStore.getStore()) return fn();
  const d = await driver();
  const ctx = await d.begin();
  try {
    const out = await txStore.run({ ctx }, fn);
    await d.commit(ctx);
    return out;
  } catch (e) {
    await d.rollback(ctx);
    throw e;
  }
}

export const now = () => new Date().toISOString();

export async function dbHealth() {
  const d = await driver();
  await d.query("SELECT 1 AS ok", []);
  return d.kind;
}
