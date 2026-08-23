import { SiteShell } from "@/components/site-shell";

// Навигация (SiteShell) — только для публичного сайта. /admin живёт вне
// этой route-группы и получает свой минимальный layout (см. app/admin/layout.tsx).
export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SiteShell>{children}</SiteShell>;
}
