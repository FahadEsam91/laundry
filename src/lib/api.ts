import "server-only";
import { NextResponse } from "next/server";
import { HttpError } from "./auth";

export const ok = (data: unknown, init?: number) => NextResponse.json(data, { status: init || 200 });
export const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

/** Wrap a route handler: JSON errors, HttpError → status */
export function handler<A extends any[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A) => {
    try {
      return await fn(...args);
    } catch (e: any) {
      if (e instanceof HttpError) return fail(e.status, e.message);
      console.error(e);
      // never leak internals (SQL, stack, config) to clients in production
      return fail(500, process.env.NODE_ENV === "production" ? "server_error" : e?.message || "server_error");
    }
  };
}

export async function body<T = any>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    return {} as T;
  }
}
