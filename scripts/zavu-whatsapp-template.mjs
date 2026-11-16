// Create the WhatsApp template for order updates on Zavu and submit it to Meta for approval.
// Run once (re-running is safe):  node scripts/zavu-whatsapp-template.mjs
// Needs ZAVUDEV_API_KEY. Optional ZAVU_SENDER_ID if the project has more than one WhatsApp sender.
import Zavudev from "@zavudev/sdk";

const NAME = "nuqa_order_update"; // the app looks the template up by this name
if (!process.env.ZAVUDEV_API_KEY) {
  console.error("Set ZAVUDEV_API_KEY first (dashboard.zavu.dev → Developers → API Keys).");
  process.exit(1);
}
const zavu = new Zavudev({ apiKey: process.env.ZAVUDEV_API_KEY });

// the sender whose WhatsApp Business Account the template belongs to
const senders = [];
for await (const s of zavu.senders.list()) senders.push(s);
const sender = process.env.ZAVU_SENDER_ID
  ? senders.find((s) => s.id === process.env.ZAVU_SENDER_ID)
  : senders.find((s) => s.channels?.includes("whatsapp") && s.isDefault) || senders.find((s) => s.channels?.includes("whatsapp"));
if (!sender) {
  console.error("No sender with an active WhatsApp channel. Connect WhatsApp in the dashboard (Channels) first, then run this again.");
  process.exit(1);
}
console.log(`Sender: ${sender.name} (${sender.id})`);

let tpl = null;
for await (const t of zavu.templates.list()) if (t.name === NAME) tpl = t;
if (!tpl) {
  tpl = await zavu.templates.create({
    name: NAME,
    language: "ar",
    whatsappCategory: "UTILITY",
    // WhatsApp does not allow a template to start or end with a variable
    body: "مرحباً، عندك تحديث على طلبك من نقاء:\n{{1}}\n{{2}}\nتابع طلبك من هنا: {{3}}\nشكراً لاختيارك نقاء.",
    variables: ["title", "message", "link"],
  });
  console.log(`Created template ${tpl.id}`);
} else console.log(`Template already exists: ${tpl.id} (${tpl.status})`);

if (tpl.status === "draft" || tpl.status === "rejected") {
  tpl = await zavu.templates.submit(tpl.id, {
    senderId: sender.id,
    category: "UTILITY",
    variableExamples: {
      var1: "تم استلام طلبك • NQ-10423",
      var2: "أرسلنا طلبك إلى مغسلة الندى",
      var3: "https://nuqa.app/orders/123",
    },
  });
  console.log(`Submitted to Meta for approval → status: ${tpl.status}`);
}
console.log(
  tpl.status === "approved"
    ? "Approved ✓ — order updates now reach every customer who turned WhatsApp on."
    : "Waiting for Meta's approval (usually minutes to a few hours). The app starts using it by itself once approved.",
);
