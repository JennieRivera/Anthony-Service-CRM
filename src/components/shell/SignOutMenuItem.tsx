"use client";

import { useTranslations } from "next-intl";
import { LogOut } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { signOutAction } from "./actions";

export function SignOutMenuItem() {
  const t = useTranslations("Nav");

  return (
    <DropdownMenuItem onClick={() => signOutAction()}>
      <LogOut className="h-4 w-4" />
      {t("signOut")}
    </DropdownMenuItem>
  );
}
