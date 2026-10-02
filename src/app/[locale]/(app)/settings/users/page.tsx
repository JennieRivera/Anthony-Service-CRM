import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { Link } from "@/i18n/navigation";
import { isDatabaseConfigured } from "@/lib/db/config";
import { getCurrentRole, hasAccessArea } from "@/lib/permissions";
import { listAuthorizedUsers } from "@/lib/queries/authorizedUsers";
import { AuthorizedUsersManager } from "@/components/settings/AuthorizedUsersManager";
import AccessDenied from "@/components/AccessDenied";
import DatabaseNotConfigured from "@/components/DatabaseNotConfigured";

export default async function AuthorizedUsersPage() {
  const t = await getTranslations("AuthorizedUsers");
  const session = await auth();

  // Phase 2H-B, section 6/9 — this is the real role-management surface,
  // so it is gated the same way every other Phase 2H-B mutation is: a
  // page-level AccessDenied for rendering, requireAccessArea() inside the
  // actions themselves for actual enforcement (never decorative).
  const role = await getCurrentRole();
  if (!role || !hasAccessArea(role, "user_role_administration")) {
    return (
      <div className="flex w-full max-w-3xl flex-col gap-6 px-8 py-10">
        <h1 className="font-heading text-2xl text-foreground">{t("title")}</h1>
        <AccessDenied />
      </div>
    );
  }

  const configured = isDatabaseConfigured();
  const authorizedUsers = configured ? await listAuthorizedUsers() : [];

  return (
    <div className="flex w-full max-w-3xl flex-col gap-6 px-8 py-10">
      <div className="flex flex-col gap-1">
        <Link href="/settings" className="text-sm text-muted-foreground underline">
          &larr; {t("backToSettings")}
        </Link>
        <h1 className="font-heading text-2xl text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      {!configured && <DatabaseNotConfigured />}
      {configured && (
        <AuthorizedUsersManager
          authorizedUsers={authorizedUsers}
          currentUserEmail={session?.user?.email?.toLowerCase() ?? null}
        />
      )}
    </div>
  );
}
