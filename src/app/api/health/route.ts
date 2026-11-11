import { dbHealth } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Liveness/readiness probe for load balancers & container platforms. */
export async function GET() {
  try {
    const db = await dbHealth();
    return Response.json({ ok: true, db, time: new Date().toISOString() });
  } catch (e: any) {
    return Response.json({ ok: false, error: "db_unavailable" }, { status: 503 });
  }
}
