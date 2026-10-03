import type { Metadata } from "next";
import { Onest, Literata, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

// Интерфейс, карточки, подписи — Onest: современный гротеск, нарисованный
// под кириллицу.
const onest = Onest({
  variable: "--font-sans",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

// Заголовки и текст постов — Literata: книжная антиква для долгого чтения,
// даёт сайту «блоговый» голос. Ось opsz — крупные заголовки рисуются
// контрастнее, мелкий текст — плотнее.
const literata = Literata({
  variable: "--font-serif",
  subsets: ["latin", "cyrillic"],
  axes: ["opsz"],
  style: ["normal", "italic"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Алексей Масюта — личное",
  description:
    "Личное пространство: заметки и лонгриды из канала про UX, коллекция пластинок и вишлист.",
  authors: [{ name: "Алексей Масюта" }],
  openGraph: {
    title: "Алексей Масюта — личное",
    description:
      "Заметки и лонгриды про UX, коллекция пластинок и вишлист.",
    type: "website",
    locale: "ru_RU",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      suppressHydrationWarning
      className={`${onest.variable} ${literata.variable} ${jetbrainsMono.variable}`}
    >
      <body className="h-[100dvh] overflow-hidden bg-background text-foreground antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
