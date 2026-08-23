// Проверка подписи Telegram Login Widget.
// https://core.telegram.org/widgets/login#checking-authorization
//
// Виджет использует redirect-режим (data-auth-url): Telegram делает обычный
// GET-редирект на наш callback с полями (id, first_name, username, photo_url,
// auth_date, hash) — подпись проверяется здесь, на сервере, а не в браузере.

import crypto from "node:crypto";

const MAX_AGE_SEC = 86400; // защита от повторного использования старой ссылки

export type TelegramLoginUser = {
  id: string;
  first_name?: string;
  username?: string;
  photo_url?: string;
};

export function verifyTelegramLoginPayload(
  params: URLSearchParams
): TelegramLoginUser | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const ownerId = process.env.TELEGRAM_OWNER_ID;
  if (!token || !ownerId) return null;

  const hash = params.get("hash");
  if (!hash) return null;

  const fields: [string, string][] = [];
  for (const [key, value] of params) {
    if (key === "hash") continue;
    fields.push([key, value]);
  }
  fields.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const dataCheckString = fields.map(([k, v]) => `${k}=${v}`).join("\n");

  const secretKey = crypto.createHash("sha256").update(token).digest();
  const computedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  const a = Buffer.from(computedHash, "hex");
  const b = Buffer.from(hash, "hex");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  const authDate = Number(params.get("auth_date"));
  if (!authDate || Date.now() / 1000 - authDate > MAX_AGE_SEC) return null;

  const id = params.get("id");
  if (!id || id !== ownerId) return null;

  return {
    id,
    first_name: params.get("first_name") ?? undefined,
    username: params.get("username") ?? undefined,
    photo_url: params.get("photo_url") ?? undefined,
  };
}
