"use client";

import { useTranslations } from "next-intl";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// No notifications feed exists yet — this is the explicit fallback from the
// bug report rather than leaving the bell inert: a real panel can replace
// this body once there's something to notify about.
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
        <p className="px-2.5 py-2 text-sm text-muted-foreground">
          {t("noNotifications")}
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
