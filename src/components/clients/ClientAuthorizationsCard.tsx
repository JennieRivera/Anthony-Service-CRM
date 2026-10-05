import { getTranslations } from "next-intl/server";
import { CheckCircle2, CircleSlash } from "lucide-react";
import { formatDateTime } from "@/lib/dates";
import type { ConsentType, LatestConsent } from "@/lib/legal/texts";

const SHOWN: ConsentType[] = [
  "not_a_law_firm",
  "phone_calls",
  "whatsapp",
  "sms",
  "email",
  "marketing",
  "document_processing",
  "privacy_notice",
];

type HistoryRow = {
  id: string;
  createdAt: Date;
  consentType: string;
  granted: boolean;
  source: "portal" | "online_booking" | "staff";
  ipAddress: string | null;
  signatureName: string | null;
};

// Staff view of the client's authorizations: the current state of each
// one (the latest consent event; the channel ones mirror Communication
// Preferences) and the full append-only history with date, source and IP.
export async function ClientAuthorizationsCard({
  latest,
  history,
}: {
  latest: Partial<Record<ConsentType, LatestConsent>>;
  history: HistoryRow[];
}) {
  const t = await getTranslations("ClientAuthorizations");
  const typeLabel = (type: string) =>
    (SHOWN as string[]).includes(type) ? t(`types.${type as ConsentType}`) : type;

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-lg text-foreground">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <ul className="grid gap-2 text-sm sm:grid-cols-2">
        {SHOWN.map((type) => {
          const event = latest[type];
          return (
            <li key={type} className="flex items-start gap-2 rounded-md border border-border p-3">
              {event?.granted ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              ) : (
                <CircleSlash className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
              )}
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-foreground">{typeLabel(type)}</span>
                <span className="text-xs text-muted-foreground">
                  {event
                    ? t(event.granted ? "grantedOn" : "withdrawnOn", {
                        date: formatDateTime(event.createdAt),
                        source: t(`sources.${event.source}`),
                      })
                    : t("never")}
                </span>
                {type === "document_processing" && event?.granted && event.signatureName && (
                  <span className="text-xs text-muted-foreground">{t("signature", { name: event.signatureName })}</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {history.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-primary underline">{t("history", { count: history.length })}</summary>
          <ul className="mt-3 flex flex-col divide-y divide-border">
            {history.map((row) => (
              <li key={row.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2">
                <span className="text-muted-foreground">{formatDateTime(row.createdAt)}</span>
                <span className="text-foreground">
                  {typeLabel(row.consentType)}: {row.granted ? t("granted") : t("withdrawn")}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t(`sources.${row.source}`)}
                  {row.ipAddress ? ` · IP ${row.ipAddress}` : ""}
                  {row.signatureName ? ` · ${t("signature", { name: row.signatureName })}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
