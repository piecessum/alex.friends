// Cloudflare Cron Trigger: no model execution here, only a signed call to the existing site.
export function clockAction(date) {
  const msk = new Date(date.getTime() + 3 * 3600_000);
  const weekday = msk.getUTCDay(), hour = msk.getUTCHours(), minute = msk.getUTCMinutes();
  if (weekday !== 0 && hour >= 8 && hour <= 9) return "publish";
  if (weekday !== 6 && (hour === 18 || hour === 22) && minute === 0) return "prepare";
  return null;
}

export default {
  async scheduled(event, env) {
    const date = new Date(event.scheduledTime);
    const planned = clockAction(date);
    const actions = [...(date.getTime() < Date.parse(env.CLOCK_TEST_UNTIL || "") ? ["check"] : []), ...(planned ? [planned] : [])];
    for (const action of actions) {
      const response = await fetch("https://alex-friends.vercel.app/api/research/tick", {
      method: "POST", headers: { authorization: `Bearer ${env.RESEARCH_CRON_SECRET}`, "content-type": "application/json" },
      body: JSON.stringify({ action, ...(action === "check" ? { probe: env.CLOCK_PROBE, scheduledAt: date.toISOString() } : {}) }), signal: AbortSignal.timeout(55_000),
    });
      if (!response.ok) throw new Error(`Research ${action}: HTTP ${response.status}`);
      console.log(JSON.stringify({ action, status: response.status, result: await response.json() }));
    }
  },
};
