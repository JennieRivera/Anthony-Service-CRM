import type { Metadata } from "next";

// Partner (alliance) portal root — "Diamante Conecta 360". Never indexed (also an X-Robots-Tag
// header in next.config.ts). Outside the staff (app) group: no AppShell.
export const metadata: Metadata = {
  title: "Diamante Conecta 360 | Anthony Multiservice",
  robots: { index: false, follow: false, nocache: true },
};

export default function PartnersRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-full flex-1 flex-col bg-secondary/40">{children}</div>;
}
