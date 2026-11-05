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

## Утренняя газета без отдельной оплаты API

Автор работает на Mac через Codex CLI с входом в ChatGPT. Расходуются лимиты
существующей подписки. Платный генератор OpenAI API и запасной платный
провайдер обложек отключены. Секрет `OPENAI_API_KEY` этой цепочке не нужен.

```bash
npm run research:setup                 # CLI в локальном .cache, не глобально
.cache/codex-cli/node_modules/.bin/codex login  # только если входа ещё нет
npm run research:local                # черновик, без публикации
npm run research:local -- --publish    # проверить сборку и отправить выпуск
npm run research:schedule             # установить расписание macOS
```

Расписание: пн–сб в 08:05 по времени Mac; в 09:05 — повторная попытка.
В будни — одна статья, в субботу — дайджест; воскресенье — выходной.
Нужны включённый Mac, вход в учётную запись macOS, интернет и действующая
авторизация Codex и GitHub. После сна macOS может выполнить пропущенный
запуск при пробуждении. При выключенном Mac нового выпуска не будет.

Автор читает источники через веб-поиск, возвращает JSON в режиме только
чтения; скрипт проверяет результат и собирает сайт в отдельном git worktree.
Рабочие файлы редактора не меняются. Коммитится только новый материал,
обложки и Telegram обрабатывает прежний GitHub Actions workflow.
Проверка формы и доступности источника не заменяет проверку фактов человеком.

Черновики и журналы: `.cache/research-draft-YYYY-MM-DD.json`,
`.cache/research-events-YYYY-MM-DD.jsonl`, `.cache/research-schedule*.log`.
Проверки: `npm run research:test`, `npm run research:local -- --check`.
Предпросмотр расписания без установки: `npm run research:schedule -- --preview`.
Удаление расписания:

```bash
launchctl bootout "gui/$(id -u)/friends.alex.research"
rm ~/Library/LaunchAgents/friends.alex.research.plist
```

## Структура проекта

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
