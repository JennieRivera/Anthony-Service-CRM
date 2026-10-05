import type { Metadata } from "next";

// Client portal root. Never indexed by search engines (also enforced with
// an X-Robots-Tag header in next.config.ts). Outside the staff (app)
// route group: no AppShell, no staff navigation.
export const metadata: Metadata = {
  title: "Portal | Anthony Multiservice",
  robots: { index: false, follow: false, nocache: true },
};

export default function PortalRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-full flex-1 flex-col bg-secondary/40">{children}</div>;
}
