import { TelegramLoginWidget } from "@/components/admin/telegram-login-widget";

const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

export const metadata = { title: "Вход — админка" };

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-xl font-semibold">Вход в админку</h1>

      {error && (
        <p className="text-sm text-red-500">
          Не удалось войти — либо это не тот аккаунт, либо ссылка устарела.
        </p>
      )}

      {BOT_USERNAME ? (
        <TelegramLoginWidget botUsername={BOT_USERNAME} />
      ) : (
        <p className="text-sm text-neutral-500">
          Не задана переменная окружения{" "}
          <code>NEXT_PUBLIC_TELEGRAM_BOT_USERNAME</code>.
        </p>
      )}

      <div className="flex w-full items-center gap-3 text-xs text-neutral-400">
        <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700" />
        или
        <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-700" />
      </div>

      <form
        action="/api/auth/code-login"
        method="POST"
        className="flex w-full gap-2"
      >
        <input
          type="password"
          name="code"
          placeholder="Код доступа"
          autoComplete="off"
          className="min-w-0 flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 dark:border-neutral-700 dark:bg-[#181818]"
        />
        <button
          type="submit"
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
        >
          Войти
        </button>
      </form>

      {process.env.NODE_ENV !== "production" && (
        <a
          href="/api/auth/dev-login"
          className="text-xs text-neutral-400 underline decoration-dotted"
        >
          Служебный вход для локальной разработки (без Telegram)
        </a>
      )}
    </main>
  );
}
