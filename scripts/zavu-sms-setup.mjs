// Turn on one-way SMS on your Zavu project (no Meta, no phone number to buy) and optionally send yourself a test.
//   node scripts/zavu-sms-setup.mjs                 → turn it on
//   node scripts/zavu-sms-setup.mjs 07XXXXXXXXX     → turn it on and send a test SMS to that number
// Needs ZAVUDEV_API_KEY. Safe to run again.
import Zavudev from "@zavudev/sdk";

if (!process.env.ZAVUDEV_API_KEY) {
  console.error("Set ZAVUDEV_API_KEY first (dashboard.zavu.dev → Developers → API Keys).");
  process.exit(1);
}
const zavu = new Zavudev({ apiKey: process.env.ZAVUDEV_API_KEY });

const senders = [];
for await (const s of zavu.senders.list()) senders.push(s);
let sender = senders.find((s) => s.isDefault) || senders[0];

if (!sender) {
  sender = await zavu.senders.create({ name: "Nuqa", enableSmsOneway: true, setAsDefault: true });
  console.log(`Created sender "${sender.name}" (${sender.id})`);
} else if (!sender.channels?.includes("sms_oneway")) {
  sender = await zavu.senders.update(sender.id, { enableSmsOneway: true });
  console.log(`Turned on one-way SMS for "${sender.name}" (${sender.id})`);
} else console.log(`One-way SMS is already on for "${sender.name}" (${sender.id})`);
console.log(`Channels: ${(sender.channels || []).join(", ") || "—"}`);
if (!sender.channels?.includes("sms_oneway")) {
  console.error("Zavu did not report sms_oneway on this sender. Check the dashboard (Channels) or contact Zavu support.");
  process.exit(1);
}

const arg = process.argv[2];
if (arg) {
  // Iraqi numbers: 07XXXXXXXXX → +9647XXXXXXXXX
  let to = arg.replace(/[^\d+]/g, "");
  if (to.startsWith("00")) to = "+" + to.slice(2);
  else if (to.startsWith("07")) to = "+964" + to.slice(1);
  else if (!to.startsWith("+")) to = "+" + to;
  try {
    const r = await zavu.messages.send({ to, channel: "sms_oneway", text: "رسالة تجربة من نقاء ✅ إذا وصلتك، رموز الدخول راح توصل بنفس الطريقة.", "Zavu-Sender": sender.id });
    console.log(`Test SMS sent to ${to} → ${r.message?.status || "queued"}. It can take a minute (SMS is reviewed before sending).`);
  } catch (e) {
    console.error(`Test SMS failed: ${e?.status || ""} ${e?.message || e}`);
    process.exit(1);
  }
}
console.log("\nNext: on the server set ZAVUDEV_API_KEY and SMS_PROVIDER=zavu in /opt/nuqa/.env, then run deploy/update.sh.");
