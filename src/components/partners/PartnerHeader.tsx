"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FileText, Handshake, House, LogOut, Megaphone, Network, UserRound } from "lucide-react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/partners", key: "home", icon: House },
  { href: "/partners/profile", key: "profile", icon: UserRound },
  { href: "/partners/documents", key: "documents", icon: FileText },
  { href: "/partners/marketing", key: "marketing", icon: Megaphone },
  { href: "/partners/referrals", key: "referrals", icon: Handshake },
] as const;

const isActive = (pathname: string, href: string) =>
  href === "/partners" ? pathname === "/partners" : pathname.startsWith(href);

// Partner portal header: business name, sign out, and the five sections as
// tabs (they scroll sideways on a narrow phone instead of wrapping).
export function PartnerHeader({ signedIn, businessName, hasLogo = false }: { signedIn: boolean; businessName?: string; hasLogo?: boolean }) {
  const t = useTranslations("Partners");
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    await fetch("/api/partners/logout", { method: "POST" }).catch(() => undefined);
    router.replace("/partners/access");
    router.refresh();
  }

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          {signedIn && hasLogo ? (
            // The alliance's own private logo, streamed by our API route.
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/api/partners/logo" alt="" className="size-9 shrink-0 rounded-md border border-border object-cover" />
          ) : (
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Network className="size-5" aria-hidden />
            </span>
          )}
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="font-heading text-base text-foreground">{t("title")}</span>
            {businessName && <span className="truncate text-xs text-muted-foreground">{businessName}</span>}
          </div>
        </div>
        {signedIn && (
          <button
            type="button"
            onClick={signOut}
            disabled={signingOut}
            className="flex min-h-10 shrink-0 items-center gap-1.5 rounded-md px-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <LogOut className="size-4" aria-hidden />
            {t("signOut")}
          </button>
        )}
      </div>
      {signedIn && (
        <nav className="mx-auto w-full max-w-4xl overflow-x-auto px-2" aria-label={t("title")}>
          <ul className="flex min-w-max gap-1">
            {NAV.map(({ href, key, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex min-h-11 items-center gap-1.5 border-b-2 px-3 text-sm",
                    isActive(pathname, href)
                      ? "border-primary font-medium text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  {t(`nav.${key}`)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
