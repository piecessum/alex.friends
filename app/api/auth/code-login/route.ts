import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import { createSessionCookie, SESSION_COOKIE, SESSION_MAX_AGE_SEC } from "@/lib/session";

// Запасной вход по коду — Telegram Login Widget (см. telegram-callback)
// оставлен как основной способ, но у Telegram случаются сбои с доставкой
// подтверждения, никак не зависящие от нашего кода. Обычная HTML-форма без
// JS, чтобы это работало максимально надёжно в любых условиях.
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const code = String(form.get("code") ?? "");
  const expected = process.env.ADMIN_ACCESS_CODE;

  const ok =
    !!expected &&
    code.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(code), Buffer.from(expected));

  if (!ok) {
    return NextResponse.redirect(new URL("/admin/login?error=1", req.url));
  }

  const res = NextResponse.redirect(new URL("/admin", req.url));
  res.cookies.set(SESSION_COOKIE, createSessionCookie("code"), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  });
  return res;
}
