"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CalendarClock, LogOut, UserRound } from "lucide-react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/portal", key: "home" },
  { href: "/portal/cases", key: "cases" },
  { href: "/portal/appointments", key: "appointments" },
  { href: "/portal/documents", key: "documents" },
  { href: "/portal/services", key: "services" },
  { href: "/portal/profile", key: "profile" },
  { href: "/portal/authorizations", key: "authorizations" },
] as const;

export function PortalHeader({
  signedIn,
  firstName,
  hasPhoto = false,
}: {
  signedIn: boolean;
  firstName?: string;
  hasPhoto?: boolean;
}) {
  const t = useTranslations("Portal");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    await fetch("/api/portal/logout", { method: "POST" }).catch(() => undefined);
    router.replace("/portal/access");
    router.refresh();
  }

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          {signedIn && hasPhoto ? (
            <Link href="/portal/profile" aria-label={t("nav.profile")} className="shrink-0">
              {/* The client's own private photo, streamed by our API route. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/api/portal/profile/photo" alt="" className="size-9 rounded-full border border-border object-cover" />
            </Link>
          ) : signedIn ? (
            <Link
              href="/portal/profile"
              aria-label={t("nav.profile")}
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
            >
              <UserRound className="size-5" aria-hidden />
            </Link>
          ) : (
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <CalendarClock className="size-5" aria-hidden />
            </span>
          )}
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="font-heading text-base text-foreground">Anthony Multiservice</span>
            {firstName && <span className="truncate text-xs text-muted-foreground">{t("hello", { name: firstName })}</span>}
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
        <nav className="mx-auto w-full max-w-3xl overflow-x-auto px-2" aria-label={t("navLabel")}>
          <ul className="flex gap-1">
            {NAV.map((item) => {
              const active = item.href === "/portal" ? pathname === "/portal" : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "block whitespace-nowrap border-b-2 px-3 py-2.5 text-sm",
                      active ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {t(`nav.${item.key}`)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </header>
  );
}
