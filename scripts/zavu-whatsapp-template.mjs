// Create the app's WhatsApp templates on Zavu and submit them to Meta for approval:
//   nuqa_order_update — order status updates (UTILITY)
//   nuqa_login_code   — login codes with a copy-code button (AUTHENTICATION)
// Run once (re-running is safe):  node scripts/zavu-whatsapp-template.mjs
// Needs ZAVUDEV_API_KEY. Optional ZAVU_SENDER_ID if the project has more than one WhatsApp sender.
import Zavudev from "@zavudev/sdk";

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

// the app looks each template up by its name
const TEMPLATES = [
  {
    create: {
      name: "nuqa_order_update",
      language: "ar",
      whatsappCategory: "UTILITY",
      // WhatsApp does not allow a template to start or end with a variable
      body: "مرحباً، عندك تحديث على طلبك من نقاء:\n{{1}}\n{{2}}\nتابع طلبك من هنا: {{3}}\nشكراً لاختيارك نقاء.",
      variables: ["title", "message", "link"],
    },
    examples: { var1: "تم استلام طلبك • NQ-10423", var2: "أرسلنا طلبك إلى مغسلة الندى", var3: "https://nuqa.app/orders/123" },
  },
  {
    create: {
      name: "nuqa_login_code",
      language: "ar",
      whatsappCategory: "AUTHENTICATION",
      // WhatsApp writes the final wording of authentication templates itself
      body: "رمز التحقق الخاص بك هو {{1}}.",
      variables: ["otp_code"],
      addSecurityRecommendation: true,
      codeExpirationMinutes: 5,
      buttons: [{ type: "otp", text: "نسخ الرمز", otpType: "COPY_CODE" }],
    },
    examples: { var1: "482913" },
  },
];

const existing = [];
for await (const t of zavu.templates.list()) existing.push(t);

for (const { create, examples } of TEMPLATES) {
  console.log(`\n▸ ${create.name}`);
  let tpl = existing.find((t) => t.name === create.name);
  if (!tpl) {
    tpl = await zavu.templates.create(create);
    console.log(`  created ${tpl.id}`);
  } else console.log(`  already exists: ${tpl.id} (${tpl.status})`);
  if (tpl.status === "draft" || tpl.status === "rejected") {
    tpl = await zavu.templates.submit(tpl.id, { senderId: sender.id, category: create.whatsappCategory, variableExamples: examples });
    console.log(`  submitted to Meta → ${tpl.status}`);
  }
  console.log(tpl.status === "approved" ? "  approved ✓ — in use" : "  waiting for Meta's approval (minutes to a few hours); the app switches to it by itself");
}
