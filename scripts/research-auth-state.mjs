// Persist the cloud robot's refreshed login only as authenticated ciphertext.
import fs from "node:fs";
import path from "node:path";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { pathToFileURL } from "node:url";

export function seal(plain, secret) {
  const key = createHash("sha256").update(secret).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]);
}

export function unseal(data, secret) {
  const key = createHash("sha256").update(secret).digest();
  const cipher = createDecipheriv("aes-256-gcm", key, data.subarray(0, 12));
  cipher.setAuthTag(data.subarray(12, 28));
  return Buffer.concat([cipher.update(data.subarray(28)), cipher.final()]);
}

function main() {
  const secret = process.env.RESEARCH_CODEX_AUTH;
  if (!secret) throw new Error("Connect the cloud robot first: RESEARCH_CODEX_AUTH is missing");
  const version = createHash("sha256").update(secret).digest("hex").slice(0, 16);
  if (process.argv[2] === "version") {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `version=${version}\n`);
    return;
  }
  if (!process.env.CODEX_HOME || !process.env.RESEARCH_AUTH_CACHE) throw new Error("Missing auth paths");
  const auth = path.join(process.env.CODEX_HOME, "auth.json");
  const encrypted = path.join(process.env.RESEARCH_AUTH_CACHE, "session.enc");
  if (process.argv[2] === "restore") {
    const plain = fs.existsSync(encrypted) ? unseal(fs.readFileSync(encrypted), secret).toString() : secret;
    const parsed = JSON.parse(plain);
    if (parsed.auth_mode !== "chatgpt" || !parsed.tokens?.refresh_token) throw new Error("Cloud author requires ChatGPT sign-in, never API-key auth");
    fs.mkdirSync(path.dirname(auth), { recursive: true, mode: 0o700 });
    fs.writeFileSync(auth, plain, { mode: 0o600 });
  } else if (process.argv[2] === "save") {
    fs.mkdirSync(path.dirname(encrypted), { recursive: true });
    fs.writeFileSync(encrypted, seal(fs.readFileSync(auth), secret), { mode: 0o600 });
  } else throw new Error("Expected version, restore or save");
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try { main(); } catch { console.error("Cloud login state unavailable or invalid; reconnect the cloud robot. No credentials logged."); process.exitCode = 1; }
}
