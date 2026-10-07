"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarDays, Ellipsis, FileText, Handshake, House, LogOut, Megaphone, Network, UserRound, Users } from "lucide-react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { ConectaDiamond } from "./ConectaDiamond";

// Same pattern as the client portal: on a computer every section is a tab
// under the header; on a phone the first four go in a bottom bar and the
// rest open from its "More" button.
const MAIN_NAV = [
  { href: "/partners", key: "home", icon: House },
  { href: "/partners/referrals", key: "referrals", icon: Handshake },
  { href: "/partners/documents", key: "documents", icon: FileText },
  { href: "/partners/marketing", key: "marketing", icon: Megaphone },
] as const;
const BASE_MORE_NAV = [
  { href: "/partners/calendar", key: "calendar", icon: CalendarDays },
  { href: "/partners/network", key: "network", icon: Users },
  { href: "/partners/profile", key: "profile", icon: UserRound },
] as const;
// Only for allies AMS authorized to see the network directory.
const DIRECTORY_NAV = { href: "/partners/directory", key: "directory", icon: Network } as const;

const isActive = (pathname: string, href: string) =>
  href === "/partners" ? pathname === "/partners" : pathname.startsWith(href);

export function PartnerHeader({
  signedIn,
  businessName,
  hasLogo = false,
  showDirectory = false,
}: {
  signedIn: boolean;
  businessName?: string;
  hasLogo?: boolean;
  showDirectory?: boolean;
}) {
  const MORE_NAV = showDirectory ? [DIRECTORY_NAV, ...BASE_MORE_NAV] : [...BASE_MORE_NAV];
  const NAV = [...MAIN_NAV, ...MORE_NAV];
  const t = useTranslations("Partners");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  // The "More" panel is open only on the page where it was opened, so it
  // closes by itself after navigating.
  const [moreOpenOn, setMoreOpenOn] = useState<string | null>(null);
  const moreOpen = moreOpenOn === pathname;
  const moreActive = MORE_NAV.some((item) => isActive(pathname, item.href));

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
            <ConectaDiamond className="size-9" />
          )}
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="font-heading text-base text-foreground">{t("title")}</span>
            <span className="truncate text-xs text-muted-foreground">{businessName ?? t("subtitle")}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={pathname}
            locale={locale === "es" ? "en" : "es"}
            className="rounded-full border border-border px-3 py-1.5 text-sm text-foreground hover:bg-secondary"
          >
            {locale === "es" ? "English" : "Español"}
          </Link>
          {signedIn && (
            <button
              type="button"
              onClick={signOut}
              disabled={signingOut}
              className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-sm text-foreground hover:bg-secondary"
            >
              <LogOut className="size-4" aria-hidden />
              <span className="sr-only sm:not-sr-only">{t("signOut")}</span>
            </button>
          )}
        </div>
      </div>

      {signedIn && (
        <nav className="mx-auto hidden w-full max-w-4xl overflow-x-auto px-2 sm:block" aria-label={t("title")}>
          <ul className="flex gap-1">
            {NAV.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm whitespace-nowrap",
                      active ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="size-4" aria-hidden />
                    {t(`nav.${item.key}`)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}

      {signedIn && (
        <nav
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] sm:hidden"
          aria-label={t("title")}
        >
          {moreOpen && (
            <ul id="partner-more-menu" className="flex flex-col border-b border-border py-1">
              {MORE_NAV.map((item) => {
                const active = isActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      onClick={() => setMoreOpenOn(null)}
                      className={cn("flex min-h-12 items-center gap-3 px-5 text-base", active ? "font-medium text-primary" : "text-foreground")}
                    >
                      <Icon className="size-5" aria-hidden />
                      {t(`nav.${item.key}`)}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          <ul className="grid grid-cols-5">
            {MAIN_NAV.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-xs",
                      active ? "font-medium text-primary" : "text-muted-foreground",
                    )}
                  >
                    <Icon className="size-5" aria-hidden />
                    <span className="max-w-full truncate">{t(`nav.${item.key}`)}</span>
                  </Link>
                </li>
              );
            })}
            <li>
              <button
                type="button"
                aria-expanded={moreOpen}
                aria-controls="partner-more-menu"
                onClick={() => setMoreOpenOn(moreOpen ? null : pathname)}
                className={cn(
                  "flex min-h-14 w-full flex-col items-center justify-center gap-0.5 px-1 text-xs",
                  moreOpen || moreActive ? "font-medium text-primary" : "text-muted-foreground",
                )}
              >
                <Ellipsis className="size-5" aria-hidden />
                <span>{t("nav.more")}</span>
              </button>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
