import { all } from "@/lib/db";
import { handler, ok } from "@/lib/api";
export const GET = handler(async () => ok({ plans: all("SELECT * FROM plans WHERE active=1 ORDER BY sort,price") }));
