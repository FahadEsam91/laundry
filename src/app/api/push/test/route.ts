import { handler, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { sendPush } from "@/lib/push";
export const POST = handler(async () => {
  const u = await requireUser();
  const sent = await sendPush([u.id], {
    title_ar: "🔔 الإشعارات تعمل!", title_en: "🔔 Notifications are on!",
    body_ar: "ستصلك تحديثات طلباتك والعروض هنا", body_en: "You'll get order updates and offers here",
    url: u.role === "partner" ? "/partner" : u.role === "driver" ? "/driver" : "/", tag: "test",
  });
  return ok({ sent });
});
