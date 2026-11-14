import { handler, ok, fail } from "@/lib/api";
import { coverageAt, zoneDTO } from "@/lib/zones";

/** Is this point served?  GET /api/zones/check?lat=&lng= → { status: open | ok | paused | outside, zone } */
export const GET = handler(async (req: Request) => {
  const u = new URL(req.url);
  const lat = Number(u.searchParams.get("lat")), lng = Number(u.searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !u.searchParams.get("lat")) return fail(400, "invalid_location");
  const c = await coverageAt(lat, lng);
  return ok({ status: c.status, zone: zoneDTO(c.zone) });
});
