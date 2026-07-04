"use client";

import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { LogOut } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

export function SignOutMenuItem() {
  const t = useTranslations("Nav");

  return (
    <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>
      <LogOut className="h-4 w-4" />
      {t("signOut")}
    </DropdownMenuItem>
  );
}
