"use client";

import { useState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Plus, Trash2, ArrowRight } from "lucide-react";
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
import { Link } from "@/i18n/navigation";
import {
  allianceNetworkFormSchema,
  type AllianceNetworkFormValues,
} from "@/lib/validation/allianceNetwork";
import { formatDate } from "@/lib/dates";

type NetworkRow = {
  id: string;
  relationshipDate: string | null;
  notes: string | null;
  recordedByEmail: string | null;
  createdAt: Date;
  otherAllianceId: string;
  otherAllianceName: string;
};

// B2B Network Foundation, section 5 — NETWORK PROVENANCE ONLY. This
// component never shows or computes a commission/amount; it only
// records and displays "this alliance introduced that alliance." Two
// separate read-only-direction lists (introduced vs. introducedBy) so
// the arrow direction is always unambiguous, never a single undirected
// "connections" list.
export function AllianceNetworkSection({
  allianceId,
  introduced,
  introducedBy,
  otherAlliances,
  onCreate,
  onDelete,
}: {
  allianceId: string;
  introduced: NetworkRow[];
  introducedBy: NetworkRow[];
  otherAlliances: { id: string; organizationName: string }[];
  onCreate: (allianceId: string, values: AllianceNetworkFormValues) => Promise<void>;
  onDelete: (allianceId: string, relationshipId: string) => Promise<void>;
}) {
  const t = useTranslations("Alliances.network");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, control, reset } = useForm<AllianceNetworkFormValues>({
    resolver: zodResolver(allianceNetworkFormSchema),
    defaultValues: { introducedAllianceId: "", relationshipDate: "", notes: "" },
  });

  function submit(values: AllianceNetworkFormValues) {
    setError(null);
    startTransition(async () => {
      try {
        await onCreate(allianceId, values);
        reset();
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  function remove(relationshipId: string) {
    setError(null);
    startTransition(async () => {
      try {
        await onDelete(allianceId, relationshipId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg text-foreground">{t("title")}</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button size="sm" disabled={otherAlliances.length === 0} />}>
            <Plus className="h-4 w-4" />
            {t("add")}
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("add")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>{t("introducedAlliance")}</Label>
                <Controller
                  control={control}
                  name="introducedAllianceId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("selectAlliance")} />
                      </SelectTrigger>
                      <SelectContent>
                        {otherAlliances.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.organizationName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="relationshipDate">{t("relationshipDate")}</Label>
                <Input id="relationshipDate" type="date" {...register("relationshipDate")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="networkNotes">{t("notes")}</Label>
                <Input id="networkNotes" {...register("notes")} />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <DialogFooter>
                <Button type="submit" disabled={isPending}>
                  {isPending ? t("saving") : t("save")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-muted-foreground">{t("introducedHeading")}</h3>
          {introduced.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noIntroduced")}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {introduced.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border p-3 text-sm"
                >
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <Link
                      href={`/alliances/${row.otherAllianceId}`}
                      className="flex items-center gap-1 font-medium text-foreground hover:underline"
                    >
                      <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                      {row.otherAllianceName}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {row.relationshipDate ? formatDate(row.relationshipDate) : "—"}
                      {row.notes ? ` · ${row.notes}` : ""}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={isPending}
                    onClick={() => remove(row.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-muted-foreground">{t("introducedByHeading")}</h3>
          {introducedBy.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noIntroducedBy")}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {introducedBy.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border p-3 text-sm"
                >
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <Link
                      href={`/alliances/${row.otherAllianceId}`}
                      className="flex items-center gap-1 font-medium text-foreground hover:underline"
                    >
                      <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                      {row.otherAllianceName}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {row.relationshipDate ? formatDate(row.relationshipDate) : "—"}
                      {row.notes ? ` · ${row.notes}` : ""}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={isPending}
                    onClick={() => remove(row.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
