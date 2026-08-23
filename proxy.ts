import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionCookie } from "@/lib/session";

// Proxy (замена deprecated middleware.ts) всегда выполняется на Node.js
// runtime, поэтому node:crypto в lib/session.ts здесь доступен без доп. флагов.
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/admin/login") return NextResponse.next();

  const session = verifySessionCookie(req.cookies.get(SESSION_COOKIE)?.value);
  if (session) return NextResponse.next();

  if (pathname.startsWith("/api/admin")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/admin/login", req.url));
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
