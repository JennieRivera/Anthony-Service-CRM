"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Menu } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { navGroups, navDrawerTriggers } from "./nav-items";
import { Logo } from "./Logo";
import { ServicesDrawer } from "./ServicesDrawer";
import { EcosystemDrawer } from "./EcosystemDrawer";

export function MobileNav() {
  const t = useTranslations("Nav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        aria-label={t("openMenu")}
        onClick={() => setOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>
      <SheetContent
        side="left"
        className="w-64 overflow-y-auto border-[var(--sidebar-border)] bg-[var(--sidebar)] p-0"
      >
        <SheetTitle className="sr-only">{t("openMenu")}</SheetTitle>
        <div className="flex h-16 items-center px-4">
          <Logo />
        </div>
        <nav className="flex flex-col gap-1 px-3 py-2">
          {navGroups.map((group, groupIndex) => (
            <div key={group.labelKey} className="flex flex-col gap-1">
              <p
                className={cn(
                  "px-3 pt-2 text-xs font-semibold tracking-wide text-[var(--sidebar-foreground)]/50 uppercase",
                  groupIndex === 0 && "pt-0",
                )}
              >
                {t(group.labelKey)}
              </p>
              {group.items.map((item) => {
                const isActive =
                  item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-[var(--sidebar-accent)] text-[var(--sidebar-accent-foreground)]"
                        : "text-[var(--sidebar-foreground)]/70 hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)]",
                    )}
                  >
                    {/* AMS Visual Correction (active-icon contrast
                        micro-correction) — see Sidebar.tsx for the full
                        rationale: gold when inactive, navy
                        (--sidebar-accent-foreground) when active. */}
                    <Icon
                      className={cn(
                        "h-4.5 w-4.5 shrink-0",
                        isActive ? "text-[var(--sidebar-accent-foreground)]" : "text-[var(--sidebar-primary)]",
                      )}
                    />
                    <span>{t(item.labelKey)}</span>
                  </Link>
                );
              })}

              {groupIndex === 3 &&
                navDrawerTriggers.map((trigger) =>
                  trigger.drawer === "services" ? (
                    <ServicesDrawer key="services" />
                  ) : (
                    <EcosystemDrawer key="ecosystem" />
                  ),
                )}
            </div>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
