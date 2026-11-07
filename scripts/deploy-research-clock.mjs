import fs from "node:fs";
const account = process.env.CF_ACCOUNT?.trim(), token = process.env.CF_TOKEN?.trim();
const secret = process.env.RESEARCH_CRON_SECRET?.trim();
if (!account || !token || !secret) throw new Error("Cloud clock credentials missing");
const base = `https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/alex-friends-research-clock`;
async function api(url, method, body) {
  const response = await fetch(url, { method, headers: { authorization: `Bearer ${token}`, ...(body instanceof FormData ? {} : { "content-type": "application/json" }) }, body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok || !data.success) throw new Error(`Cloud clock API HTTP ${response.status}; codes ${(data.errors || []).map(e => e.code).join(",")}`);
  return data.result;
}
const form = new FormData();
form.set("metadata", JSON.stringify({ main_module: "worker.mjs", compatibility_date: "2026-11-07", keep_bindings: ["secret_text"], bindings: [
  { type: "plain_text", name: "CLOCK_PROBE", text: process.env.GITHUB_RUN_ID },
  { type: "plain_text", name: "CLOCK_TEST_UNTIL", text: new Date(Date.now() + 3600_000).toISOString() },
] }));
form.set("worker.mjs", new Blob([fs.readFileSync("scripts/research-clock.mjs", "utf8")], { type: "application/javascript+module" }), "worker.mjs");
await api(base, "PUT", form);
await api(`${base}/secrets`, "PUT", { type: "secret_text", name: "RESEARCH_CRON_SECRET", text: secret });
await api(`${base}/subdomain`, "POST", { enabled: false });
await api(`${base}/schedules`, "PUT", [{ cron: "* * * * *" }]);
const schedules = await api(`${base}/schedules`, "GET");
console.log("Independent cloud clock configured:", JSON.stringify(schedules));
