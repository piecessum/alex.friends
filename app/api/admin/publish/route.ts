import { NextResponse } from "next/server";
import { publishDocToTelegram, PublishError } from "@/lib/publish-doc";
import type { PMNode } from "@/lib/editor-doc-walk";

// Фаза А публикации: только отправка в Telegram (текст и/или картинки).
// Результат возвращается клиенту и передаётся вторым запросом в
// /api/admin/publish/commit — так повторная попытка при сбое коммита не
// долбит Telegram ещё раз. Доступ уже проверен proxy.ts.

export async function POST(req: Request) {
  const body = await req.json();
  const doc = body.doc as PMNode | undefined;
  if (!doc) {
    return NextResponse.json({ error: "doc обязателен" }, { status: 400 });
  }

  try {
    const telegramResult = await publishDocToTelegram(doc);
    return NextResponse.json({ telegramResult });
  } catch (e) {
    const message = e instanceof PublishError ? e.message : "Ошибка публикации в Telegram";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
