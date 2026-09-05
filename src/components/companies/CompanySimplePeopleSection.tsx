"use client";

import { useState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  companyContactFormSchema,
  type CompanyContactFormValues,
} from "@/lib/validation/company";
import type { CompanyContact, CompanyAuthorizedRepresentative } from "@/lib/db/schema";

// Shared UI for Company Contacts and Company Authorized Representatives —
// same field shape (name, role, phone, email, notes, optional linked
// client), different tables/semantics. Company Owners has extra
// owner-specific fields (ownership %, authorized signer, dates) and gets
// its own component instead.
export function CompanySimplePeopleSection({
  companyId,
  people,
  clients,
  labels,
  onCreate,
  onDelete,
}: {
  companyId: string;
  people: (CompanyContact | CompanyAuthorizedRepresentative)[];
  clients: { id: string; fullName: string }[];
  labels: {
    title: string;
    add: string;
    name: string;
    role: string;
    phone: string;
    email: string;
    linkedClient: string;
    noLinkedClient: string;
    empty: string;
    save: string;
    saving: string;
  };
  onCreate: (companyId: string, values: CompanyContactFormValues) => Promise<void>;
  onDelete: (companyId: string, id: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const { register, handleSubmit, control, reset } = useForm<CompanyContactFormValues>({
    resolver: zodResolver(companyContactFormSchema),
    defaultValues: { clientId: "", name: "", role: "", phone: "", email: "", notes: "" },
  });

  function submit(values: CompanyContactFormValues) {
    startTransition(async () => {
      await onCreate(companyId, values);
      reset();
      setOpen(false);
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg text-foreground">{labels.title}</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button size="sm" />}>
            <Plus className="h-4 w-4" />
            {labels.add}
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{labels.add}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label>{labels.linkedClient}</Label>
                  <Controller
                    control={control}
                    name="clientId"
                    render={({ field }) => (
                      <Select
                        value={field.value || "none"}
                        onValueChange={(v) => field.onChange(v === "none" ? "" : v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">{labels.noLinkedClient}</SelectItem>
                          {clients.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.fullName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="personName">{labels.name}</Label>
                  <Input id="personName" {...register("name")} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="personRole">{labels.role}</Label>
                  <Input id="personRole" {...register("role")} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="personPhone">{labels.phone}</Label>
                  <Input id="personPhone" {...register("phone")} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="personEmail">{labels.email}</Label>
                  <Input id="personEmail" type="email" {...register("email")} />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isPending}>
                  {isPending ? labels.saving : labels.save}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {people.length === 0 ? (
        <p className="text-sm text-muted-foreground">{labels.empty}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {people.map((person) => (
            <div
              key={person.id}
              className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
            >
              <div className="flex flex-col gap-1">
                <span className="font-medium text-foreground">
                  {person.name}
                  {person.role ? ` — ${person.role}` : ""}
                </span>
                <span className="text-xs text-muted-foreground">
                  {[person.phone, person.email].filter(Boolean).join(" · ") || "—"}
                </span>
              </div>
              <Button
                variant="outline"
                size="icon"
                disabled={isPending}
                onClick={() => startTransition(() => onDelete(companyId, person.id))}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
