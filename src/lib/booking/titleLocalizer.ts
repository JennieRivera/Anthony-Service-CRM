import { getTranslations } from "next-intl/server";
import { localizeBookingTitle } from "./titles";

// Server-component wrapper: returns a function that shows an online-booking
// appointment/task title in the current CRM language (any other title is
// returned unchanged). Client components use useBookingTitle() instead.
export async function getBookingTitleLocalizer(): Promise<(title: string) => string> {
  const tService = await getTranslations("ServiceType");
  const tSource = await getTranslations("AppointmentSource");
  return (title) =>
    localizeBookingTitle(title, {
      service: (k) => tService(k),
      source: (k, v) => tSource(k as "online_booking", v),
    });
}
