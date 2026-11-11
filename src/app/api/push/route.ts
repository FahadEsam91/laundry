import { handler, ok } from "@/lib/api";
import { vapid } from "@/lib/push";
export const GET = handler(async () => ok({ publicKey: vapid().publicKey }));
