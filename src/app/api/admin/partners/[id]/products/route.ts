import { all } from "@/lib/db";
import { handler, ok } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
export const GET = handler(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requirePermission("partners.view");
  return ok({ products: await all("SELECT p.*,s.name_ar s_ar,s.name_en s_en,s.slug FROM products p JOIN services s ON s.id=p.service_id WHERE p.partner_id=? ORDER BY s.sort,p.id", Number((await params).id)) });
});
