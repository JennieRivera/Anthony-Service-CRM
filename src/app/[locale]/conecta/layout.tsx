import type { Metadata } from "next";

// Public "Join Diamante Conecta 360" pages. Not indexed for now (also an
// X-Robots-Tag header in next.config.ts). No staff AppShell.
export const metadata: Metadata = {
  title: "Diamante Conecta 360 | Anthony Multiservice",
  robots: { index: false, follow: false, nocache: true },
};

export default function ConectaLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-full flex-1 flex-col bg-secondary/40">{children}</div>;
}
