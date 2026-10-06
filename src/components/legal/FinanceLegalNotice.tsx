import { Landmark } from "lucide-react";
import { getLocale } from "next-intl/server";
import { getDb } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/db/config";
import { getLegalTexts, pickLocale } from "@/lib/legal/texts";
import type { PortalDb } from "@/lib/portal/db";

// The "not a law firm / not an NMLS-licensed lender" notice, highlighted on
// the credit and commercial-financing services in the CRM (same text as
// Settings → Legal texts → "not a law firm").
export async function FinanceLegalNotice() {
  if (!isDatabaseConfigured()) return null;
  const [texts, locale] = await Promise.all([getLegalTexts(getDb() as unknown as PortalDb), getLocale()]);
  return (
    <p className="flex items-start gap-2 rounded-lg border-2 border-primary/50 bg-card p-4 text-sm text-foreground" role="note">
      <Landmark className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
      <span>{pickLocale(texts.not_a_law_firm, locale)}</span>
    </p>
  );
}
