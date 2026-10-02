import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Plug, ShieldCheck, LayoutGrid, Globe, Palette, Stamp, DollarSign, SunMoon, Users } from "lucide-react";
import AccessDenied from "@/components/AccessDenied";
import { getCurrentRole, hasAccessArea } from "@/lib/permissions";

export default async function SettingsPage() {
  const t = await getTranslations("Settings");
  const session = await auth();

  // Phase 2H — section 4: Administration (Settings/Integrations/Security/
  // user-role administration) is its own permission area.
  const role = await getCurrentRole();
  if (!role || !hasAccessArea(role, "settings")) {
    return (
      <div className="flex w-full max-w-3xl flex-col gap-6 px-8 py-10">
        <h1 className="font-heading text-2xl text-foreground">{t("title")}</h1>
        <AccessDenied />
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-3xl flex-col gap-6 px-8 py-10">
      <h1 className="font-heading text-2xl text-foreground">{t("title")}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t("businessProfile")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">
              {t("businessName")}
            </p>
            <p className="text-foreground">Anthony Multiservice, LLC</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t("phone")}</p>
            <p className="text-foreground">(689) 342-6309</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t("address")}</p>
            <p className="text-foreground">2610 Orchid Ln, Kissimmee, FL</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t("languages")}</p>
            <p className="text-foreground">English / Español</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("account")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div>
            <p className="text-sm text-muted-foreground">
              {t("signedInAs")}
            </p>
            <p className="text-foreground">{session?.user?.email}</p>
          </div>
          <p className="text-sm text-muted-foreground">{t("accessNote")}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("notifications")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            {t("notificationsComingSoon")}
          </p>
          <div className="flex items-center justify-between">
            <Label htmlFor="notify-appointment">
              {t("notifyNewAppointment")}
            </Label>
            <Switch id="notify-appointment" disabled />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="notify-paid">{t("notifyInvoicePaid")}</Label>
            <Switch id="notify-paid" disabled />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="notify-overdue">
              {t("notifyOverdueInvoice")}
            </Label>
            <Switch id="notify-overdue" disabled />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("staffAccounts")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            {t("staffAccountsDescription")}
          </p>
          <div>
            <Button variant="outline" render={<Link href="/settings/users" />}>
              <Users className="h-4 w-4" />
              {t("manageStaffAccounts")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("appearanceCard")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            {t("appearanceCardDescription")}
          </p>
          <div>
            <Button
              variant="outline"
              render={<Link href="/settings/appearance" />}
            >
              <SunMoon className="h-4 w-4" />
              {t("manageAppearance")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("serviceColorsCard")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            {t("serviceColorsCardDescription")}
          </p>
          <div>
            <Button
              variant="outline"
              render={<Link href="/settings/service-colors" />}
            >
              <Palette className="h-4 w-4" />
              {t("manageServiceColors")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("serviceCatalogCard")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            {t("serviceCatalogCardDescription")}
          </p>
          <div>
            <Button
              variant="outline"
              render={<Link href="/settings/service-catalog" />}
            >
              <DollarSign className="h-4 w-4" />
              {t("manageServiceCatalog")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("notaryGuideCard")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            {t("notaryGuideCardDescription")}
          </p>
          <div>
            <Button
              variant="outline"
              render={<Link href="/settings/notary-guide" />}
            >
              <Stamp className="h-4 w-4" />
              {t("manageNotaryGuide")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("integrations")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            {t("integrationsDescription")}
          </p>
          <div>
            <Button
              variant="outline"
              render={<Link href="/settings/integrations" />}
            >
              <Plug className="h-4 w-4" />
              {t("manageIntegrations")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("professionalSystemsCard")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            {t("professionalSystemsCardDescription")}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              render={<Link href="/professional-systems" />}
            >
              <LayoutGrid className="h-4 w-4" />
              {t("manageProfessionalSystems")}
            </Button>
            <Button variant="outline" render={<Link href="/websites" />}>
              <Globe className="h-4 w-4" />
              {t("manageWebsites")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("security")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            {t("securityDescription")}
          </p>
          <div>
            <Button
              variant="outline"
              render={<Link href="/settings/audit-log" />}
            >
              <ShieldCheck className="h-4 w-4" />
              {t("viewAuditLog")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
