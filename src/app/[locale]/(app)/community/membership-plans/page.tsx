import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { isDatabaseConfigured } from "@/lib/db/config";
import {
  listMembershipPlans,
  listMembershipBenefits,
  countMembershipsForPlan,
  listAllPlanBenefitLinks,
} from "@/lib/queries/memberships";
import { MembershipPlansManager } from "@/components/community/MembershipPlansManager";
import DatabaseNotConfigured from "@/components/DatabaseNotConfigured";
import AccessDenied from "@/components/AccessDenied";
import { getCurrentRole, hasAccessArea } from "@/lib/permissions";

export default async function MembershipPlansPage() {
  const t = await getTranslations("Membership");

  const role = await getCurrentRole();
  if (!role || !hasAccessArea(role, "b2b_membership")) {
    return (
      <div className="flex w-full flex-col gap-6 px-8 py-10">
        <h1 className="font-heading text-2xl text-foreground">{t("plansTitle")}</h1>
        <AccessDenied />
      </div>
    );
  }

  const configured = isDatabaseConfigured();
  const plans = configured ? await listMembershipPlans() : [];
  const benefits = configured ? await listMembershipBenefits() : [];
  const membershipCounts = configured
    ? Object.fromEntries(
        await Promise.all(plans.map(async (p) => [p.id, await countMembershipsForPlan(p.id)] as const)),
      )
    : {};
  const planBenefitLinks = configured ? await listAllPlanBenefitLinks() : [];
  const planBenefitIds: Record<string, string[]> = {};
  for (const link of planBenefitLinks) {
    (planBenefitIds[link.planId] ??= []).push(link.benefitId);
  }

  return (
    <div className="flex w-full max-w-4xl flex-col gap-6 px-8 py-10">
      <div className="flex flex-col gap-1">
        <Link href="/community" className="text-sm text-muted-foreground underline">
          &larr; {t("backToCommunity")}
        </Link>
        <h1 className="font-heading text-2xl text-foreground">{t("plansTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("plansDescription")}</p>
      </div>

      {!configured && <DatabaseNotConfigured />}
      {configured && (
        <MembershipPlansManager
          plans={plans}
          benefits={benefits}
          membershipCounts={membershipCounts}
          planBenefitIds={planBenefitIds}
        />
      )}
    </div>
  );
}
