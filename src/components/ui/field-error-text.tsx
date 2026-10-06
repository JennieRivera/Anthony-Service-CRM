"use client";

import { useTranslations } from "next-intl";
import {
  GENERIC_VALIDATION_KEY,
  isZodDefaultMessage,
  validationMessageKey,
} from "@/lib/i18n/validationMessages";

// Shows a form validation message in the page's language. Use it wherever
// a form prints errors.<field>.message (react-hook-form + Zod).
export function FieldErrorText({ message }: { message?: string | null }) {
  const t = useTranslations("ValidationMessages");
  if (!message) return null;
  const key = validationMessageKey(message);
  if (t.has(key)) return <>{t(key)}</>;
  if (isZodDefaultMessage(message)) return <>{t(GENERIC_VALIDATION_KEY)}</>;
  return <>{message}</>;
}
