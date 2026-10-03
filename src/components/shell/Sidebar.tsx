"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { navGroups, navDrawerTriggers } from "./nav-items";
import { Logo } from "./Logo";
import { ServicesDrawer } from "./ServicesDrawer";
import { EcosystemDrawer } from "./EcosystemDrawer";

export function Sidebar() {
  const t = useTranslations("Nav");
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar)] transition-[width] duration-200 md:flex",
        collapsed ? "w-[72px]" : "w-64",
      )}
    >
      <div className="flex h-16 items-center overflow-hidden px-4">
        {collapsed ? (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--sidebar-primary)] font-heading text-xs text-[var(--sidebar-primary)]">
            AMS
          </span>
        ) : (
          <Logo />
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-2">
        {navGroups.map((group, groupIndex) => (
          <div key={group.labelKey} className="flex flex-col gap-1">
            {!collapsed && (
              <p
                className={cn(
                  "px-3 pt-2 text-xs font-semibold tracking-wide text-[var(--sidebar-foreground)]/50 uppercase",
                  groupIndex === 0 && "pt-0",
                )}
              >
                {t(group.labelKey)}
              </p>
            )}
            {group.items.map((item) => {
              const isActive =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-[var(--sidebar-accent)] text-[var(--sidebar-accent-foreground)]"
                      : "text-[var(--sidebar-foreground)]/70 hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)]",
                  )}
                  title={collapsed ? t(item.labelKey) : undefined}
                >
                  {/* AMS Visual Correction (active-icon contrast
                      micro-correction) — gold (--sidebar-primary) only
                      when inactive. On the active row the icon switches
                      to the same dark navy as the active text
                      (--sidebar-accent-foreground): gold measures only
                      ~1.3:1 against the sky-blue active background
                      (--sidebar-accent), which read as washed out — navy
                      matches the text at the already-documented ~6.48:1
                      AAA pairing used for --sidebar-accent-foreground
                      elsewhere in this file. Resting-hover (not active)
                      intentionally stays gold — only ACTIVE was reported
                      as a problem, so only ACTIVE changes here. */}
                  <Icon
                    className={cn(
                      "h-4.5 w-4.5 shrink-0",
                      isActive ? "text-[var(--sidebar-accent-foreground)]" : "text-[var(--sidebar-primary)]",
                    )}
                  />
                  {!collapsed && <span>{t(item.labelKey)}</span>}
                </Link>
              );
            })}

            {/* The two slide-out drawers render right after FINANCE
                (navGroups[3]) and before REPORTING, matching the master
                prompt's literal sidebar order. */}
            {groupIndex === 3 &&
              navDrawerTriggers.map((trigger) =>
                trigger.drawer === "services" ? (
                  <ServicesDrawer key="services" collapsedTrigger={collapsed} />
                ) : (
                  <EcosystemDrawer key="ecosystem" collapsedTrigger={collapsed} />
                ),
              )}
          </div>
        ))}
      </nav>

      <div className="border-t border-[var(--sidebar-border)] p-3">
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? t("expandSidebar") : t("collapseSidebar")}
          className="flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-sm text-[var(--sidebar-foreground)]/70 transition-colors hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)]"
        >
          {collapsed ? (
            <ChevronsRight className="h-4.5 w-4.5" />
          ) : (
            <ChevronsLeft className="h-4.5 w-4.5" />
          )}
        </button>
      </div>
    </aside>
  );
}
