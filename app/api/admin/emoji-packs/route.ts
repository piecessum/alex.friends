import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

// Самообслуживание палитры кастомных эмодзи (content/telegram-emoji-set.json)
// — без похода ко мне каждый раз. Пишет прямо в локальный файл (не коммитит
// в GitHub): при работе через Electron+`npm run dev` (основной сценарий,
// см. alex-friends-desktop/) новый набор становится доступен сразу же после
// перезагрузки страницы редактора. Чтобы он попал и на задеплоенный сайт —
// нужен обычный git commit + push этого файла (как и любой другой контент).

const FILE = path.join(process.cwd(), "content", "telegram-emoji-set.json");

type Entry = { id: string; fallback: string; label: string };

function readSet(): Entry[] {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    return [];
  }
}

/** Принимает и короткое имя пака, и ссылку вида t.me/addemoji/<name>. */
function parsePackName(input: string): string {
  const trimmed = input.trim();
  const m = trimmed.match(/(?:addemoji|addstickers)\/([A-Za-z0-9_]+)/i);
  return (m ? m[1] : trimmed).replace(/^@/, "");
}

export async function GET() {
  return NextResponse.json({ emojiSet: readSet() });
}

export async function POST(req: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN не задан" }, { status: 500 });
  }

  const body = await req.json();
  const name = parsePackName(String(body.name ?? ""));
  if (!name) {
    return NextResponse.json({ error: "Укажи имя набора или ссылку" }, { status: 400 });
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/getStickerSet`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const data = await res.json();
  if (!data.ok) {
    return NextResponse.json({ error: data.description || "Набор не найден" }, { status: 400 });
  }

  const stickers = (data.result.stickers ?? []) as {
    custom_emoji_id?: string;
    emoji: string;
  }[];
  const withCustomId = stickers.filter((s) => s.custom_emoji_id);
  if (withCustomId.length === 0) {
    return NextResponse.json(
      { error: "В этом наборе нет кастомных эмодзи (обычные стикеры сюда не подходят)" },
      { status: 400 }
    );
  }

  const current = readSet();
  const byId = new Map(current.map((e) => [e.id, e]));
  let added = 0;
  for (const s of withCustomId) {
    if (!byId.has(s.custom_emoji_id!)) added++;
    byId.set(s.custom_emoji_id!, { id: s.custom_emoji_id!, fallback: s.emoji, label: name });
  }

  const merged = [...byId.values()];
  fs.writeFileSync(FILE, JSON.stringify(merged, null, 2) + "\n");

  return NextResponse.json({ emojiSet: merged, added, total: withCustomId.length });
}
