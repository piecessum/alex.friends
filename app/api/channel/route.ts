import { NextResponse } from "next/server";
import { fetchChannel } from "@/lib/telegram";

export async function GET(request: Request) {
  const before = new URL(request.url).searchParams.get("before") ?? undefined;
  const page = await fetchChannel(before);
  return NextResponse.json(page);
}
