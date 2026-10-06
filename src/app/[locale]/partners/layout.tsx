import type { Metadata } from "next";

// Partner (alliance) portal root. Never indexed (also an X-Robots-Tag
// header in next.config.ts). Outside the staff (app) group: no AppShell.
export const metadata: Metadata = {
  title: "Portal de Aliados | Anthony Multiservice",
  robots: { index: false, follow: false, nocache: true },
};

export default function PartnersRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-full flex-1 flex-col bg-secondary/40">{children}</div>;
}
