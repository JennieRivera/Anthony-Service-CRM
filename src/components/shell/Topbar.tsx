import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MobileNav } from "./MobileNav";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import { SignOutMenuItem } from "./SignOutMenuItem";
import { GlobalSearch } from "./GlobalSearch";
import { NotificationsMenu } from "./NotificationsMenu";

export async function Topbar() {
  const t = await getTranslations("Nav");
  const session = await auth();
  const email = session?.user?.email ?? "";
  const initials = email.slice(0, 2).toUpperCase();

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-card px-4 md:px-6">
      <MobileNav />

      <GlobalSearch />

      <div className="ml-auto flex items-center gap-2">
        <LocaleSwitcher />

        <NotificationsMenu />

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                aria-label={t("account")}
              />
            }
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuLabel>{email || t("account")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <SignOutMenuItem />
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
