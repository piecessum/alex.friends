// Management uses official Cloudflare OAuth; routine execution stays in the cloud.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cache = path.join(root, ".cache");
const key = fs.readFileSync(path.join(cache, "research-cron-secret"), "utf8").trim();
if (!key) throw new Error("Configure the dedicated clock key first");
const probe = String(Date.now());
fs.writeFileSync(path.join(cache, "research-clock-probe"), probe);
const config = path.join(cache, "research-clock.wrangler.json");
const bindings = path.join(cache, "research-clock-bindings.json");
fs.writeFileSync(config, JSON.stringify({
  name: "alex-friends-research-clock", main: path.join(root, "scripts/research-clock.mjs"),
  compatibility_date: "2026-11-07", workers_dev: false,
  triggers: { crons: ["* * * * *"] },
  vars: { CLOCK_PROBE: probe, CLOCK_TEST_UNTIL: new Date(Date.now() + 3600_000).toISOString() },
}, null, 2));
fs.writeFileSync(bindings, JSON.stringify({ RESEARCH_CRON_SECRET: key }), { mode: 0o600 });
const env = { ...process.env, WRANGLER_SEND_METRICS: "false" };
for (const name of ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_API_KEY", "CLOUDFLARE_EMAIL"]) delete env[name];
try {
  const result = spawnSync(path.join(cache, "wrangler-cli/node_modules/.bin/wrangler"), ["deploy", "--config", config, "--secrets-file", bindings, "--autoconfig=false"], { cwd: root, stdio: "inherit", env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exitCode = 1;
  else console.log(`Clock probe: .openai/research-clock/${probe}.json (wait for a real Cron Trigger)`);
} finally { fs.rmSync(bindings, { force: true }); }
