import { NextResponse } from "next/server";
import { publishDocToTelegram, PublishError } from "@/lib/publish-doc";
import { publishNoteAnnounce, AnnounceError } from "@/lib/telegram-announce";
import type { PMNode } from "@/lib/editor-doc-walk";

// Фаза А публикации: только отправка в Telegram (пост целиком — для
// коротких постов; анонс с обложкой и ссылкой — для лонгридов). Результат
// возвращается клиенту и передаётся вторым запросом в
// /api/admin/publish/commit — так повторная попытка при сбое коммита не
// долбит Telegram ещё раз. Доступ уже проверен proxy.ts.

export async function POST(req: Request) {
  const body = await req.json();
  const doc = body.doc as PMNode | undefined;
  const mode = body.mode === "note" ? "note" : "short";
  if (!doc) {
    return NextResponse.json({ error: "doc обязателен" }, { status: 400 });
  }

  try {
    if (mode === "note") {
      const title = String(body.title ?? "");
      const telegramResult = await publishNoteAnnounce(title, doc);
      return NextResponse.json({ telegramResult });
    }
    const telegramResult = await publishDocToTelegram(doc);
    return NextResponse.json({ telegramResult });
  } catch (e) {
    const message =
      e instanceof PublishError || e instanceof AnnounceError
        ? e.message
        : "Ошибка публикации в Telegram";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
