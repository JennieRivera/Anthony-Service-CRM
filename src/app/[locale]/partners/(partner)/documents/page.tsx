import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePartnerPage } from "@/lib/partners/page";
import { PARTNER_DOCUMENT_TYPES } from "@/lib/partners/queries";
import { getAllianceArchive } from "@/lib/partners/archive";
import { AllianceArchive } from "@/components/partners/AllianceArchive";

// "My files": Documents (what the alliance uploaded and what AMS shared
// with it), Photos & images (its own images, profile gallery and logo) and
// Marketing (what AMS shares). Only its own files and what AMS marked
// visible.
export default async function PartnerDocumentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requirePartnerPage(locale);
  if (!ctx) return null;

  const items = await getAllianceArchive(ctx.db, ctx.allianceId, "partner");
  const t = await getTranslations("Archive");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl text-foreground">{t("title")}</h1>
        <p className="text-muted-foreground">{t("intro")}</p>
      </div>
      <AllianceArchive items={items} mode="partner" documentTypes={PARTNER_DOCUMENT_TYPES} />
    </div>
  );
}
