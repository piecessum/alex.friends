// Management uses official Cloudflare OAuth; routine execution stays in the cloud.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cache = path.join(root, ".cache");
const cli = path.join(cache, "wrangler-cli/node_modules/.bin/wrangler");
const env = { ...process.env, WRANGLER_SEND_METRICS: "false" };
for (const name of ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_API_KEY", "CLOUDFLARE_EMAIL"]) delete env[name];
function cliJson(args) {
  const result = spawnSync(cli, args, { cwd: root, encoding: "utf8", env });
  if (result.status !== 0) throw new Error("Cloudflare OAuth lookup failed; run wrangler login");
  try { return JSON.parse(result.stdout); } catch { throw new Error("Invalid Cloudflare OAuth response"); }
}
const identity = cliJson(["whoami", "--json"]);
const account = process.env.CLOUDFLARE_ACCOUNT_ID || (identity.accounts?.length === 1 ? identity.accounts[0].id : undefined);
if (!account || !identity.accounts.some(a => a.id === account)) throw new Error("Select the Cloudflare account explicitly");
// Cron Triggers require an account workers.dev namespace even when the Worker's HTTP URL is disabled.
const auth = cliJson(["auth", "token", "--json"]);
if (auth.type !== "oauth" || !auth.token) throw new Error("Official Cloudflare OAuth login required");
const subdomainUrl = `https://api.cloudflare.com/client/v4/accounts/${account}/workers/subdomain`;
const existing = await fetch(subdomainUrl, { headers: { authorization: `Bearer ${auth.token}` } });
const current = await existing.json();
if (!current.result?.subdomain) {
  if (![200, 400, 404].includes(existing.status)) throw new Error(`Workers namespace lookup HTTP ${existing.status}`);
  const created = await fetch(subdomainUrl, { method: "PUT", headers: { authorization: `Bearer ${auth.token}`, "content-type": "application/json" }, body: JSON.stringify({ subdomain: `alex-friends-${account.slice(0, 8)}` }) });
  const result = await created.json();
  if (!created.ok || !result.success) throw new Error(`Workers namespace setup HTTP ${created.status}`);
  console.log("Free account Workers namespace initialized.");
}
const key = fs.readFileSync(path.join(cache, "research-cron-secret"), "utf8").trim();
if (!key) throw new Error("Configure the dedicated clock key first");
const probe = String(Date.now());
fs.writeFileSync(path.join(cache, "research-clock-probe"), probe);
const config = path.join(cache, "research-clock.wrangler.json");
const bindings = path.join(cache, "research-clock-bindings.json");
fs.writeFileSync(config, JSON.stringify({
  name: "alex-friends-research-clock", account_id: account, main: path.join(root, "scripts/research-clock.mjs"),
  compatibility_date: "2026-11-07", workers_dev: false,
  triggers: { crons: ["* * * * *"] },
  vars: { CLOCK_PROBE: probe, CLOCK_TEST_UNTIL: new Date(Date.now() + 3600_000).toISOString() },
}, null, 2));
fs.writeFileSync(bindings, JSON.stringify({ RESEARCH_CRON_SECRET: key }), { mode: 0o600 });
try {
  const result = spawnSync(cli, ["deploy", "--config", config, "--secrets-file", bindings, "--autoconfig=false"], { cwd: root, stdio: "inherit", env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exitCode = 1;
  else console.log(`Clock probe: .openai/research-clock/${probe}.json (wait for a real Cron Trigger)`);
} finally { fs.rmSync(bindings, { force: true }); }
