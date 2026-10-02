import type { Metadata } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Playfair_Display, Public_Sans } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { routing } from "@/i18n/routing";
import { Toaster } from "@/components/ui/sonner";
import { AccentProvider, accentInitScript } from "@/components/theme/AccentProvider";
import "../globals.css";

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Anthony Multiservice CRM",
  description: "CRM for Anthony Multiservice, LLC",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${playfairDisplay.variable} ${publicSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Phase 1.5C — pre-hydration accent init, same flash-prevention
            technique next-themes uses internally for data-theme. */}
        <script dangerouslySetInnerHTML={{ __html: accentInitScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="data-theme" defaultTheme="light" enableSystem storageKey="ams-theme-mode">
          <AccentProvider>
            <NextIntlClientProvider messages={messages}>
              {children}
              <Toaster />
            </NextIntlClientProvider>
          </AccentProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
