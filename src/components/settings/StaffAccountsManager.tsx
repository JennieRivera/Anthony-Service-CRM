"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StaffAccountFormDialog } from "./StaffAccountFormDialog";
import {
  createStaffAccountAction,
  updateStaffAccountRoleAction,
  deleteStaffAccountAction,
} from "@/app/[locale]/(app)/settings/staff-accounts/actions";
import type { User } from "@/lib/db/schema";

export function StaffAccountsManager({ accounts }: { accounts: User[] }) {
  const t = useTranslations("StaffAccounts");
  const tRole = useTranslations("UserRole");
  const [isPending, startTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function handleDelete(id: string) {
    setDeleteError(null);
    startTransition(async () => {
      try {
        await deleteStaffAccountAction(id);
      } catch (err) {
        setDeleteError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <StaffAccountFormDialog onSubmit={createStaffAccountAction} />
      </div>

      {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}

      {accounts.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground">{account.email}</span>
                  {account.name && (
                    <span className="text-sm text-muted-foreground">
                      ({account.name})
                    </span>
                  )}
                </div>
                <Badge variant="outline" className="w-fit">
                  {account.role ? tRole(account.role) : t("noRole")}
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <StaffAccountFormDialog
                  account={account}
                  onSubmit={(values) => updateStaffAccountRoleAction(account.id, values)}
                />
                <Button
                  variant="outline"
                  size="icon"
                  disabled={isPending}
                  onClick={() => handleDelete(account.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
