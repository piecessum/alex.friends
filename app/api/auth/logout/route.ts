import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

export async function POST(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/admin/login", req.url));
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
