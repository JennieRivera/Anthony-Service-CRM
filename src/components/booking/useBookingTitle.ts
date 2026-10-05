"use client";

import { useTranslations } from "next-intl";
import { localizeBookingTitle } from "@/lib/booking/titles";

// Client-component counterpart of getBookingTitleLocalizer(): shows an
// online-booking appointment/task title in the current CRM language; any
// other title is returned unchanged.
export function useBookingTitle(): (title: string) => string {
  const tService = useTranslations("ServiceType");
  const tSource = useTranslations("AppointmentSource");
  const tSystem = useTranslations("SystemTitles");
  return (title) =>
    localizeBookingTitle(title, {
      service: (k) => tService(k),
      source: (k, v) => tSource(k as "online_booking", v),
      system: (k) => tSystem(k as "portalUpload"),
    });
}
