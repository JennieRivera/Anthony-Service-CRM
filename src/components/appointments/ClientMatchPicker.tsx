"use client";

import { useState, useTransition } from "react";
import { Controller, type Control, type UseFormRegister, type UseFormSetValue, type UseFormWatch } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Search, X, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { searchClientMatchesAction } from "@/app/[locale]/(app)/appointments/actions";
import type { AppointmentFormValues } from "@/lib/validation/appointment";

type Mode = "existing" | "new";

export function ClientMatchPicker({
  control,
  register,
  setValue,
  watch,
  clients,
}: {
  control: Control<AppointmentFormValues>;
  register: UseFormRegister<AppointmentFormValues>;
  setValue: UseFormSetValue<AppointmentFormValues>;
  watch: UseFormWatch<AppointmentFormValues>;
  clients: { id: string; fullName: string }[];
}) {
  const t = useTranslations("Appointments.form");
  const clientId = watch("clientId");
  const [mode, setMode] = useState<Mode>("existing");
  const [searchPhone, setSearchPhone] = useState("");
  const [searchEmail, setSearchEmail] = useState("");
  const [searchBusiness, setSearchBusiness] = useState("");
  const [results, setResults] = useState<Awaited<
    ReturnType<typeof searchClientMatchesAction>
  > | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedClient = clients.find((c) => c.id === clientId);

  function runSearch() {
    startTransition(async () => {
      const found = await searchClientMatchesAction({
        phone: searchPhone,
        email: searchEmail,
        businessName: searchBusiness,
      });
      setResults(found);
    });
  }

  function selectMatch(id: string) {
    setValue("clientId", id, { shouldValidate: true });
    setValue("newClientFullName", "");
    setValue("newClientPhone", "");
    setValue("newClientEmail", "");
    setValue("newClientBusinessName", "");
    setResults(null);
  }

  function clearSelection() {
    setValue("clientId", "", { shouldValidate: true });
  }

  function switchMode(next: Mode) {
    setMode(next);
    setValue("clientId", "");
    setResults(null);
    if (next === "existing") {
      setValue("newClientFullName", "");
      setValue("newClientPhone", "");
      setValue("newClientEmail", "");
      setValue("newClientBusinessName", "");
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === "existing" ? "default" : "outline"}
          onClick={() => switchMode("existing")}
        >
          {t("existingClient")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "new" ? "default" : "outline"}
          onClick={() => switchMode("new")}
        >
          {t("newClientLead")}
        </Button>
      </div>

      {mode === "existing" && (
        <div className="flex flex-col gap-3">
          {selectedClient ? (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <UserCheck className="h-3.5 w-3.5" />
                {selectedClient.fullName}
              </Badge>
              <Button type="button" size="sm" variant="ghost" onClick={clearSelection}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                {t("matchSearchHint")}
              </p>
              <div className="grid gap-2 sm:grid-cols-3">
                <Input
                  placeholder={t("searchByPhone")}
                  value={searchPhone}
                  onChange={(e) => setSearchPhone(e.target.value)}
                />
                <Input
                  placeholder={t("searchByEmail")}
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                />
                <Input
                  placeholder={t("searchByBusinessName")}
                  value={searchBusiness}
                  onChange={(e) => setSearchBusiness(e.target.value)}
                />
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-fit"
                disabled={isPending}
                onClick={runSearch}
              >
                <Search className="h-4 w-4" />
                {isPending ? t("searching") : t("search")}
              </Button>

              {results && results.length === 0 && (
                <p className="text-sm text-muted-foreground">{t("noMatchesFound")}</p>
              )}
              {results && results.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  {results.map((r) => (
                    <button
                      type="button"
                      key={r.id}
                      onClick={() => selectMatch(r.id)}
                      className="flex flex-col items-start rounded-md border border-border p-2 text-left text-sm hover:bg-muted"
                    >
                      <span className="font-medium text-foreground">{r.fullName}</span>
                      <span className="text-xs text-muted-foreground">
                        {[r.phone, r.email].filter(Boolean).join(" · ") || "—"}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <Label>{t("orSelectClient")}</Label>
                <Controller
                  control={control}
                  name="clientId"
                  render={({ field }) => (
                    <Select value={field.value || ""} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("selectClient")} />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </>
          )}
        </div>
      )}

      {mode === "new" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="newClientFullName">{t("newClientFullName")}</Label>
            <Input id="newClientFullName" {...register("newClientFullName")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="newClientPhone">{t("newClientPhone")}</Label>
            <Input id="newClientPhone" {...register("newClientPhone")} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="newClientEmail">{t("newClientEmail")}</Label>
            <Input id="newClientEmail" type="email" {...register("newClientEmail")} />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="newClientBusinessName">{t("newClientBusinessName")}</Label>
            <Input id="newClientBusinessName" {...register("newClientBusinessName")} />
          </div>
          <p className="text-xs text-muted-foreground sm:col-span-2">
            {t("newClientHint")}
          </p>
        </div>
      )}
    </div>
  );
}
