"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { DrawerSection } from "./nav-drawers";

// Shared slide-out drawer for both ServicesDrawer and EcosystemDrawer
// (master prompt sections 4 & 6) — every link it renders comes from
// nav-drawers.ts and points at a route that already existed before this
// Phase 1 change; this component only presents them, it doesn't add any.
export function NavDrawer({
  labelKey,
  sections,
  icon: Icon,
  collapsedTrigger,
}: {
  labelKey: "services" | "amsEcosystem";
  sections: DrawerSection[];
  icon: LucideIcon;
  collapsedTrigger?: boolean;
}) {
  const t = useTranslations("Nav");
  const tService = useTranslations("ServiceType");
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <button
            type="button"
            title={collapsedTrigger ? t(labelKey) : undefined}
            className={cn(
              "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-[var(--sidebar-foreground)]/70 transition-colors hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)]",
            )}
          />
        }
      >
        {/* Final visual correction — gold nav icons, see Sidebar.tsx. */}
        <Icon className="h-4.5 w-4.5 shrink-0 text-[var(--sidebar-primary)]" />
        {!collapsedTrigger && (
          <>
            <span className="flex-1 text-left">{t(labelKey)}</span>
            <ChevronRight className="h-4 w-4 opacity-60" />
          </>
        )}
      </SheetTrigger>
      {/* AMS Visual Correction (final drawer direction) — the drawer now
          mirrors the main sidebar's own AMS blue (--drawer == --sidebar's
          values) instead of the earlier pale-ivory look, so it reads as
          an extension of the permanent sidebar. Menu/link TEXT uses
          --drawer-foreground (white/cream); the drawer's TITLE, section
          headings, and link ICONS use the separate --drawer-primary gold
          instead — those three no longer share a color with the menu
          text, so each needs its own explicit class (icons in particular
          can no longer just inherit currentColor from the link's white
          text). These tokens already flip correctly between Light and
          Dark mode, so this component needs no theme-conditional code. */}
      <SheetContent
        side="left"
        className="w-80 overflow-y-auto border-[var(--drawer-border)] bg-[var(--drawer)] [&_[data-slot=sheet-close]]:text-[var(--drawer-foreground)]"
      >
        <SheetHeader>
          <SheetTitle className="text-[var(--drawer-primary)]">{t(labelKey)}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4 pb-4">
          {sections.map((section, index) => (
            <div key={index} className="flex flex-col gap-1">
              {section.headingKey && (
                <p className="px-1 pt-1 text-xs font-semibold tracking-wide text-[var(--drawer-primary)] uppercase">
                  {t(section.headingKey)}
                </p>
              )}
              {section.links.map((link) => {
                const LinkIcon = link.icon;
                return (
                  <Link
                    key={`${link.href}-${link.serviceType ?? link.navLabelKey ?? link.labelKey}`}
                    href={link.href}
                    // Deferred: closing the Sheet synchronously in the same
                    // click that triggers the Link's navigation unmounts the
                    // anchor (Sheet content lives in a portal) before
                    // Next.js's own click handler finishes calling
                    // router.push, which intermittently drops the
                    // navigation entirely. Letting the click's own handlers
                    // run first, then closing on the next tick, fixed it.
                    onClick={() => setTimeout(() => setOpen(false), 0)}
                    className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-[var(--drawer-foreground)] transition-colors hover:bg-[var(--drawer-accent)] hover:text-[var(--drawer-accent-foreground)]"
                  >
                    <LinkIcon className="h-4 w-4 shrink-0 text-[var(--drawer-primary)]" />
                    <span>
                      {link.serviceType ? tService(link.serviceType) : t(link.navLabelKey ?? link.labelKey ?? "")}
                    </span>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
