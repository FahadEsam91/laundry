import "server-only";
/** Best-effort client IP behind proxies/CDNs. */
export function clientIp(req: Request) {
  const h = req.headers;
  return (h.get("cf-connecting-ip") || h.get("x-real-ip") || h.get("x-forwarded-for")?.split(",")[0] || "unknown").trim().slice(0, 64);
}
