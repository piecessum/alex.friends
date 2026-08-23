// Простая signed-cookie сессия для /admin — без внешних JWT-библиотек.
// Кука хранит {uid, iat} в base64url + HMAC-SHA256 подпись на SESSION_SECRET.

import crypto from "node:crypto";

export const SESSION_COOKIE = "admin_session";
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30 дней

type SessionPayload = { uid: string; iat: number };

function sign(data: string): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET не задан в env");
  return crypto.createHmac("sha256", secret).update(data).digest("hex");
}

export function createSessionCookie(uid: string): string {
  const payload: SessionPayload = { uid, iat: Math.floor(Date.now() / 1000) };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${data}.${sign(data)}`;
}

/** Возвращает payload сессии, если кука валидна и не просрочена, иначе null. */
export function verifySessionCookie(
  raw: string | undefined | null
): SessionPayload | null {
  if (!raw || !process.env.SESSION_SECRET) return null;
  const dot = raw.indexOf(".");
  if (dot < 0) return null;
  const data = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);

  let expected: string;
  try {
    expected = sign(data);
  } catch {
    return null;
  }
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(data, "base64url").toString("utf8")
    ) as SessionPayload;
    if (
      typeof payload.uid !== "string" ||
      typeof payload.iat !== "number" ||
      Date.now() / 1000 - payload.iat > SESSION_MAX_AGE_SEC
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
