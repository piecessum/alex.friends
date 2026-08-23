import { NextResponse, type NextRequest } from "next/server";
import { verifyTelegramLoginPayload } from "@/lib/telegram-auth";
import {
  createSessionCookie,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SEC,
} from "@/lib/session";

// Redirect-режим Telegram Login Widget приходит сюда GET-запросом с
// query-параметрами (id, first_name, username, photo_url, auth_date, hash).
export async function GET(req: NextRequest) {
  const user = verifyTelegramLoginPayload(req.nextUrl.searchParams);
  if (!user) {
    return NextResponse.redirect(new URL("/admin/login?error=1", req.url));
  }

  const res = NextResponse.redirect(new URL("/admin", req.url));
  res.cookies.set(SESSION_COOKIE, createSessionCookie(user.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  });
  return res;
}
