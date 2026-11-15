/**
 * Background jobs, started once per server process: recurring pickups and membership renewals run every minute,
 * even when nobody has the site open.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const g = globalThis as unknown as { __nuqaJobs?: boolean };
  if (g.__nuqaJobs) return;
  g.__nuqaJobs = true;
  const tick = async () => {
    try {
      const { runSchedules } = await import("./lib/schedules");
      const { renewSweep } = await import("./lib/subscriptions");
      await runSchedules();
      await renewSweep();
    } catch (e) {
      console.error("[jobs]", e);
    }
  };
  setTimeout(tick, 15000);
  setInterval(tick, 60000);
}
