// List your Zavu senders and the channels each one can send on.
//   ZAVUDEV_API_KEY=zv_live_… node scripts/zavu-senders.mjs
import Zavudev from "@zavudev/sdk";

if (!process.env.ZAVUDEV_API_KEY) {
  console.error("Set ZAVUDEV_API_KEY first (dashboard.zavu.dev → Developers → API Keys).");
  process.exit(1);
}
const zavu = new Zavudev({ apiKey: process.env.ZAVUDEV_API_KEY });
let n = 0;
for await (const s of zavu.senders.list()) {
  n++;
  const channels = s.channels?.length ? s.channels.join(", ") : "— none yet (connect or activate a channel)";
  const where = [s.phoneNumber, s.emailAddress].filter(Boolean).join(" · ");
  console.log(`${s.isDefault ? "★" : " "} ${s.name}  (${s.id})${where ? `  ${where}` : ""}\n    channels: ${channels}\n    webhook: ${s.webhook?.url || "not set"}`);
}
if (!n) console.log("No senders yet. Connect a channel in the dashboard (Channels) — a sender is created automatically.");
