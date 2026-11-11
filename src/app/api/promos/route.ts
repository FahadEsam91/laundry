import { all } from "@/lib/db";
import { handler, ok } from "@/lib/api";
export const GET = handler(async () => {
  return ok({ promos: await all("SELECT code,kind,value,min_order,max_discount,first_order_only,expires_at,title_ar,title_en FROM promos WHERE active=1 AND (expires_at IS NULL OR expires_at>?) AND (usage_limit IS NULL OR used<usage_limit) ORDER BY id", new Date().toISOString()) });
});
