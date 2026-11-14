import { handler, ok, body } from "@/lib/api";
import { can, currentUser, HttpError } from "@/lib/auth";
import { saveImage } from "@/lib/media";

/**
 * Upload an image: { data: "data:image/jpeg;base64,…", kind?: "order" } → { url }.
 *  - kind "order": any signed-in customer, a private photo of their items (attached when the order is placed)
 *  - otherwise: laundry photos, for staff who manage laundries and for laundry owners
 */
export const POST = handler(async (req: Request) => {
  const u = await currentUser();
  if (!u) throw new HttpError(401, "unauthorized");
  const b = await body(req);
  if (b.kind === "order") return ok({ url: await saveImage(b.data, u.id, { private: true }) }, 201);
  if (!(can(u, "partners.manage") || (u.role === "partner" && u.partner_id))) throw new HttpError(403, "forbidden");
  return ok({ url: await saveImage(b.data, u.id) }, 201);
});
