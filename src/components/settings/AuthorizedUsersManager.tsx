"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  createAuthorizedUserAction,
  updateAuthorizedUserRoleAction,
  updateAuthorizedUserActiveAction,
} from "@/app/[locale]/(app)/settings/users/actions";
import { assignableRoleValues } from "@/lib/validation/authorizedUser";
import type { User } from "@/lib/db/schema";

type AssignableRole = (typeof assignableRoleValues)[number];
type NewUserDraft = { name: string; email: string; role: AssignableRole | "" };

const emptyDraft: NewUserDraft = { name: "", email: "", role: "" };

export function AuthorizedUsersManager({
  authorizedUsers,
  currentUserEmail,
}: {
  authorizedUsers: User[];
  currentUserEmail: string | null;
}) {
  const t = useTranslations("AuthorizedUsers");
  const tRole = useTranslations("Role");
  const [isPending, startTransition] = useTransition();
  const [newUser, setNewUser] = useState<NewUserDraft>(emptyDraft);
  const [addError, setAddError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  function submitNewUser() {
    if (!newUser.role) return;
    setAddError(null);
    startTransition(async () => {
      try {
        await createAuthorizedUserAction({ ...newUser, role: newUser.role as AssignableRole });
        setNewUser(emptyDraft);
      } catch (err) {
        setAddError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  function saveRole(id: string, role: AssignableRole) {
    setRowError(null);
    startTransition(async () => {
      try {
        await updateAuthorizedUserRoleAction(id, { role });
        setEditingId(null);
      } catch (err) {
        setRowError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  function toggleActive(id: string, isActive: boolean) {
    setRowError(null);
    startTransition(async () => {
      try {
        await updateAuthorizedUserActiveAction(id, { isActive });
      } catch (err) {
        setRowError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
        <h2 className="font-medium text-foreground">{t("addUser")}</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>{t("name")}</Label>
            <Input
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              className="w-44"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("email")}</Label>
            <Input
              type="email"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              className="w-56"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t("role")}</Label>
            <Select
              value={newUser.role}
              onValueChange={(v) => v && setNewUser({ ...newUser, role: v as AssignableRole })}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder={t("selectRole")} />
              </SelectTrigger>
              <SelectContent>
                {assignableRoleValues.map((role) => (
                  <SelectItem key={role} value={role}>
                    {tRole(role)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            disabled={isPending || !newUser.name.trim() || !newUser.email.trim() || !newUser.role}
            onClick={submitNewUser}
          >
            {isPending ? t("authorizing") : t("authorize")}
          </Button>
        </div>
        {addError && <p className="text-sm text-destructive">{addError}</p>}
      </div>

      <div className="flex flex-col gap-2">
        {authorizedUsers.length === 0 && (
          <p className="text-sm text-muted-foreground">{t("noUsers")}</p>
        )}
        {authorizedUsers.map((user) => {
          const isSelf = currentUserEmail !== null && user.email === currentUserEmail;
          return (
            <div
              key={user.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4"
            >
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="font-medium text-foreground">{user.name || user.email}</span>
                <span className="text-sm text-muted-foreground">{user.email}</span>
                {isSelf && <span className="text-xs text-muted-foreground">{t("ownRowNote")}</span>}
              </div>

              {editingId === user.id ? (
                <Select
                  defaultValue={user.role ?? undefined}
                  onValueChange={(v) => v && saveRole(user.id, v as AssignableRole)}
                >
                  <SelectTrigger className="w-48" disabled={isPending}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {assignableRoleValues.map((role) => (
                      <SelectItem key={role} value={role}>
                        {tRole(role)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant="secondary">{user.role ? tRole(user.role) : "—"}</Badge>
              )}

              {!isSelf && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={isPending}
                  onClick={() => setEditingId(editingId === user.id ? null : user.id)}
                >
                  {editingId === user.id ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                </Button>
              )}

              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground">
                  {user.isActive ? t("active") : t("inactive")}
                </Label>
                <Switch
                  checked={user.isActive}
                  disabled={isSelf || isPending}
                  onCheckedChange={(checked) => toggleActive(user.id, checked)}
                />
              </div>
            </div>
          );
        })}
        {rowError && <p className="text-sm text-destructive">{rowError}</p>}
      </div>
    </div>
  );
}
