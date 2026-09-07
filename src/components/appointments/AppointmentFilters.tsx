"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AppointmentListFilters } from "@/lib/queries/appointments";
import { serviceTypeValues } from "@/lib/validation/client";
import {
  appointmentStatusValues,
  appointmentTypeValues,
} from "@/lib/validation/appointment";

// Calendar enhancement, Session 6 (CALENDAR-PLAN.md section 10). Every
// filter is a URL search param (same pattern as CommunicationFilters), so
// the filtered view is a shareable/bookmarkable link and the actual
// filtering happens server-side in listAppointmentsWithClient. "Color de
// Servicio" isn't a separate filter — the Service dropdown already shows
// each option's calendar color as a swatch, since picking a service and
// picking its color are the same choice on this calendar.
export function AppointmentFilters({
  activeFilters,
  colors,
}: {
  activeFilters: AppointmentListFilters;
  colors: Record<string, string>;
}) {
  const t = useTranslations("Appointments");
  const tService = useTranslations("ServiceType");
  const tStatus = useTranslations("AppointmentStatus");
  const tType = useTranslations("AppointmentType");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [clientInput, setClientInput] = useState(activeFilters.client ?? "");
  const [locationInput, setLocationInput] = useState(activeFilters.location ?? "");
  const [referralInput, setReferralInput] = useState(
    activeFilters.referralSource ?? "",
  );

  function setFilter(key: keyof AppointmentListFilters, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  const hasActiveFilters = Object.values(activeFilters).some(Boolean);

  function clearAll() {
    setClientInput("");
    setLocationInput("");
    setReferralInput("");
    router.push(pathname);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={activeFilters.serviceType ?? "all"}
        onValueChange={(value) => setFilter("serviceType", value)}
      >
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("filters.allServices")}</SelectItem>
          {serviceTypeValues.map((service) => (
            <SelectItem key={service} value={service}>
              <span
                aria-hidden
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: colors[service] ?? colors.other ?? "#78909C" }}
              />
              {tService(service)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={activeFilters.status ?? "all"}
        onValueChange={(value) => setFilter("status", value)}
      >
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("filters.allStatuses")}</SelectItem>
          {appointmentStatusValues.map((status) => (
            <SelectItem key={status} value={status}>
              {tStatus(status)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={activeFilters.appointmentType ?? "all"}
        onValueChange={(value) => setFilter("appointmentType", value)}
      >
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("filters.allTypes")}</SelectItem>
          {appointmentTypeValues.map((type) => (
            <SelectItem key={type} value={type}>
              {tType(type)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={activeFilters.language ?? "all"}
        onValueChange={(value) => setFilter("language", value)}
      >
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t("filters.allLanguages")}</SelectItem>
          <SelectItem value="en">{t("filters.languageEnglish")}</SelectItem>
          <SelectItem value="es">{t("filters.languageSpanish")}</SelectItem>
        </SelectContent>
      </Select>

      <Input
        value={clientInput}
        onChange={(e) => setClientInput(e.target.value)}
        onBlur={() => setFilter("client", clientInput.trim() || null)}
        onKeyDown={(e) => {
          if (e.key === "Enter") setFilter("client", clientInput.trim() || null);
        }}
        placeholder={t("filters.clientPlaceholder")}
        className="w-44"
      />

      <Input
        value={locationInput}
        onChange={(e) => setLocationInput(e.target.value)}
        onBlur={() => setFilter("location", locationInput.trim() || null)}
        onKeyDown={(e) => {
          if (e.key === "Enter") setFilter("location", locationInput.trim() || null);
        }}
        placeholder={t("filters.locationPlaceholder")}
        className="w-44"
      />

      <Input
        value={referralInput}
        onChange={(e) => setReferralInput(e.target.value)}
        onBlur={() => setFilter("referralSource", referralInput.trim() || null)}
        onKeyDown={(e) => {
          if (e.key === "Enter") setFilter("referralSource", referralInput.trim() || null);
        }}
        placeholder={t("filters.referralSourcePlaceholder")}
        className="w-44"
      />

      <Input
        type="date"
        value={activeFilters.date ?? ""}
        onChange={(e) => setFilter("date", e.target.value || null)}
        className="w-40"
      />

      {hasActiveFilters && (
        <Button size="sm" variant="ghost" onClick={clearAll}>
          <X className="h-4 w-4" />
          {t("filters.clear")}
        </Button>
      )}
    </div>
  );
}
