// Отдельный минимальный layout — БЕЗ SiteShell (сайдбар/навигация публичного
// сайта, см. app/(site)/layout.tsx). /admin — самостоятельный инструмент,
// открывается и в браузере, и в Electron-обёртке (../alex-friends-desktop).
//
// Верхняя полоса — зона перетаскивания окна для Electron
// (titleBarStyle: "hiddenInset" в main.js прячет системный заголовок, но
// окну всё равно нужна draggable-область, иначе его нельзя двигать мышью).
// В обычном браузере -webkit-app-region ни на что не влияет.
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      <div className="h-7 shrink-0" style={{ WebkitAppRegion: "drag" } as React.CSSProperties} />
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
