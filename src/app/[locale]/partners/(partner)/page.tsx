import { getTranslations, setRequestLocale } from "next-intl/server";
import { FileText, Handshake, Megaphone, UserRound } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { requirePartnerPage } from "@/lib/partners/page";
import { getPartnerAlliance, listPartnerDocuments, listPartnerMarketing, listPartnerReferrals } from "@/lib/partners/queries";

// Partner portal home: a short summary of each section.
export default async function PartnerHomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await requirePartnerPage(locale);
  if (!ctx) return null;

  const [alliance, documents, marketing, referrals] = await Promise.all([
    getPartnerAlliance(ctx.db, ctx.allianceId),
    listPartnerDocuments(ctx.db, ctx.allianceId),
    listPartnerMarketing(ctx.db, ctx.allianceId),
    listPartnerReferrals(ctx.db, ctx.allianceId),
  ]);
  const t = await getTranslations("Partners.home");
  const openReferrals = referrals.toPartner.filter((r) => r.stage === "new").length;

  const cards = [
    { href: "/partners/referrals", icon: Handshake, title: t("referrals"), text: t("referralsText", { count: openReferrals }) },
    { href: "/partners/documents", icon: FileText, title: t("documents"), text: t("documentsText", { count: documents.length }) },
    { href: "/partners/marketing", icon: Megaphone, title: t("marketing"), text: t("marketingText", { count: marketing.shared.length }) },
    { href: "/partners/profile", icon: UserRound, title: t("profile"), text: t("profileText") },
  ] as const;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl text-foreground">{t("welcome", { name: alliance?.organizationName ?? "" })}</h1>
        <p className="text-muted-foreground">{t("intro")}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map(({ href, icon: Icon, title, text }) => (
          <Link key={href} href={href} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 hover:border-primary/50">
            <Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            <span className="flex flex-col gap-0.5">
              <span className="font-medium text-foreground">{title}</span>
              <span className="text-sm text-muted-foreground">{text}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
