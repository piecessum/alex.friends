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
        <script
          async
          src="https://telegram.org/js/telegram-widget.js?22"
          data-telegram-login={BOT_USERNAME}
          data-size="large"
          data-auth-url="/api/auth/telegram-callback"
          data-request-access="write"
        />
      ) : (
        <p className="text-sm text-neutral-500">
          Не задана переменная окружения{" "}
          <code>NEXT_PUBLIC_TELEGRAM_BOT_USERNAME</code>.
        </p>
      )}
    </main>
  );
}
