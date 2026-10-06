import { getTranslations, setRequestLocale } from "next-intl/server";
import { Download, ImageIcon } from "lucide-react";
import { formatDate } from "@/lib/dates";
import { requirePartnerPage } from "@/lib/partners/page";
import { listPartnerMarketing } from "@/lib/partners/queries";
import { PartnerUploadForm } from "@/components/partners/PartnerUploadForm";

// Marketing: materials AMS shared (all partners or this one) to download,
// and the alliance's own materials sent to AMS for approval.
export default async function PartnerMarketingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requirePartnerPage(locale);
  if (!ctx) return null;

  const { shared, submitted } = await listPartnerMarketing(ctx.db, ctx.allianceId);
  const t = await getTranslations("Partners.marketing");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl text-foreground">{t("title")}</h1>
        <p className="text-muted-foreground">{t("intro")}</p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg text-foreground">{t("sharedTitle")}</h2>
        {shared.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">{t("sharedEmpty")}</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {shared.map((a) => (
              <li key={a.id} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
                <span className="flex min-w-0 items-center gap-2 font-medium text-foreground">
                  <ImageIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="truncate">{a.fileName}</span>
                </span>
                {a.caption && <p className="text-sm text-muted-foreground">{a.caption}</p>}
                <a href={`/api/partners/marketing/${a.id}/file?download=1`} className="flex w-fit items-center gap-1 text-sm text-primary underline">
                  <Download className="size-4" aria-hidden />
                  {t("download")}
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg text-foreground">{t("submitTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("submitIntro")}</p>
        <PartnerUploadForm kind="marketing" withCaption label={t("submit")} />
        {submitted.length > 0 && (
          <ul className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card">
            {submitted.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
                <span className="truncate font-medium text-foreground">{a.fileName}</span>
                <span className="flex items-center gap-3 text-muted-foreground">
                  <span>{t(`status.${a.approvalStatus}`)}</span>
                  <span>{formatDate(a.createdAt)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
