import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Plug, ShieldCheck } from "lucide-react";

export default async function SettingsPage() {
  const t = await getTranslations("Settings");
  const session = await auth();

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
            <p className="text-foreground">(407) 802-7252</p>
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
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t("staffAccountsComingSoon")}
          </p>
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
