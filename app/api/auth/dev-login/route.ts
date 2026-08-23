import { NextResponse, type NextRequest } from "next/server";
import { createSessionCookie, SESSION_COOKIE, SESSION_MAX_AGE_SEC } from "@/lib/session";

// Вход в обход Telegram Login Widget — только для локальной разработки, пока
// не настроен @BotFather /setdomain (виджет требует реального прод-домена,
// localhost не подходит). На Vercel (NODE_ENV=production) этот роут всегда
// 404 — реальный вход только через Telegram, см. app/admin/login/page.tsx.
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("not found", { status: 404 });
  }

  const res = NextResponse.redirect(new URL("/admin", req.url));
  res.cookies.set(SESSION_COOKIE, createSessionCookie("dev"), {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  });
  return res;
}
