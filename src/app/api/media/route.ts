import { handler, ok, body } from "@/lib/api";
import { can, currentUser, HttpError } from "@/lib/auth";
import { saveImage } from "@/lib/media";

/** Upload an image: { data: "data:image/jpeg;base64,…" } → { url }. Staff who manage laundries, and laundry owners. */
export const POST = handler(async (req: Request) => {
  const u = await currentUser();
  if (!u) throw new HttpError(401, "unauthorized");
  if (!(can(u, "partners.manage") || (u.role === "partner" && u.partner_id))) throw new HttpError(403, "forbidden");
  return ok({ url: await saveImage((await body(req)).data, u.id) }, 201);
});
