"use client";

import { useTranslations } from "next-intl";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// No notifications feed exists yet — this is the explicit fallback from the
// bug report rather than leaving the bell inert: a real panel can replace
// this body once there's something to notify about.
//
// The body is a disabled DropdownMenuItem rather than a bare <p>: a Menu
// popup is conventionally built from Menu.Item children for roving-focus
// management, so this matches Base UI's own usage pattern even though the
// item itself is inert (no hover/click). This was tried as a fix for the
// menu intermittently not opening during browser testing, but that same
// symptom was also reproduced on the unmodified Account menu (which does
// have real items) under the same automated-click testing, so the actual
// cause looks like testing-tool flakiness, not a real item-count
// requirement — kept anyway since it's a harmless, arguably more correct
// pattern either way.
export function NotificationsMenu() {
  const t = useTranslations("Nav");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" aria-label={t("notifications")} />}
      >
        <Bell className="h-4.5 w-4.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuItem disabled className="text-muted-foreground">
          {t("noNotifications")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
