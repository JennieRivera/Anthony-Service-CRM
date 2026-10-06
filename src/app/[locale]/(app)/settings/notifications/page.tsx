import { getTranslations } from "next-intl/server";
import { desc } from "drizzle-orm";
import { Link } from "@/i18n/navigation";
import { isDatabaseConfigured } from "@/lib/db/config";
import { getDb } from "@/lib/db";
import { notificationOutbox, notificationTexts } from "@/lib/db/schema";
import { getCurrentRole, hasAccessArea } from "@/lib/permissions";
import { getNotificationSettings } from "@/lib/notifications/engine";
import { isEmailConfigured, isSmsConfigured, NOTICE_FROM_EMAIL, smsSetupStatus } from "@/lib/notifications/providers";
import { noticeBaseUrl } from "@/lib/notifications/server";
import type { PortalDb } from "@/lib/portal/db";
import { NotificationSettingsManager } from "@/components/settings/NotificationSettingsManager";
import AccessDenied from "@/components/AccessDenied";
import DatabaseNotConfigured from "@/components/DatabaseNotConfigured";

// Settings → Automatic notices (Step 3B).
export default async function NotificationSettingsPage() {
  const t = await getTranslations("Notices");

  const role = await getCurrentRole();
  if (!role || !hasAccessArea(role, "settings")) {
    return (
      <div className="flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-8">
        <h1 className="font-heading text-2xl text-foreground">{t("title")}</h1>
        <AccessDenied />
      </div>
    );
  }

  const configured = isDatabaseConfigured();
  const db = configured ? (getDb() as unknown as PortalDb) : null;
  const [settings, savedTexts, recent] = db
    ? await Promise.all([
        getNotificationSettings(db),
        db.select().from(notificationTexts),
        db
          .select({
            id: notificationOutbox.id,
            createdAt: notificationOutbox.createdAt,
            sentAt: notificationOutbox.sentAt,
            type: notificationOutbox.type,
            channel: notificationOutbox.channel,
            recipient: notificationOutbox.recipient,
            status: notificationOutbox.status,
            error: notificationOutbox.error,
            testMode: notificationOutbox.testMode,
          })
          .from(notificationOutbox)
          .orderBy(desc(notificationOutbox.createdAt))
          .limit(40),
      ])
    : [null, [], []];

  return (
    <div className="flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-8">
      <div className="flex flex-col gap-1">
        <Link href="/settings" className="text-sm text-muted-foreground underline">
          &larr; {t("backToSettings")}
        </Link>
        <h1 className="font-heading text-2xl text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      {!configured && <DatabaseNotConfigured />}
      {settings && (
        <NotificationSettingsManager
          settings={settings}
          savedTexts={savedTexts.map((r) => ({
            type: r.type,
            channel: r.channel,
            language: r.language,
            subject: r.subject ?? "",
            body: r.body,
          }))}
          recent={recent.map((r) => ({
            ...r,
            createdAt: r.createdAt.toISOString(),
            sentAt: r.sentAt?.toISOString() ?? null,
          }))}
          providers={{
            email: isEmailConfigured(),
            sms: isSmsConfigured(),
            smsStatus: smsSetupStatus(),
            fromEmail: NOTICE_FROM_EMAIL(),
            webhookUrl: `${noticeBaseUrl()}/api/webhooks/twilio/sms`,
          }}
        />
      )}
    </div>
  );
}
