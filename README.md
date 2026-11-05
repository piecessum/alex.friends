# friends

Личное пространство Алексея Масюты — заметки и лонгриды про UX, коллекция пластинок и вишлист. Сайт-компаньон к [сайту-резюме](../alex).

**Стек:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Framer Motion · next-themes. Тот же дизайн-фундамент, что и у резюме.

## Локально

```bash
npm install
npm run dev   # http://localhost:3000
npm run build # production-сборка
```

## Деплой

Push в `main` → автодеплой на Vercel.

После деплоя пропиши реальный адрес сайта-резюме в `lib/site.ts` (константа `RESUME_URL`) или через переменную окружения `NEXT_PUBLIC_RESUME_URL` в настройках Vercel.

## Структура

- `app/` — App Router: главная (`page.tsx`), `notes/` (заметки), `vinyl/` (пластинки)
- `components/` — `site-header`, `site-footer` (перелинковка с резюме), тема
- `lib/site.ts` — внешние ссылки и перелинковка
- `lib/utils.ts` — `cn()` helper

## Дорожная карта

- [x] Каркас + перелинковка с резюме
- [ ] Блог из Markdown (`content/posts/`)
- [ ] Obsidian → Git → Vercel
- [x] Автопостинг в Telegram-канал (`scripts/publish-telegram.mjs`)
- [x] Карточки пластинок
- [x] 3D-переворот карточек
