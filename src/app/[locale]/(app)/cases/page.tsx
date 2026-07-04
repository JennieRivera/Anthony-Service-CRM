import { desc } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { getDb } from "@/lib/db";
import { cases as casesTable } from "@/lib/db/schema";
import { isDatabaseConfigured } from "@/lib/db/config";
import { Link } from "@/i18n/navigation";
import DatabaseNotConfigured from "@/components/DatabaseNotConfigured";

export default async function CasesPage() {
  const t = await getTranslations("Nav");
  const tService = await getTranslations("ServiceType");
  const configured = isDatabaseConfigured();

  let cases: (typeof casesTable.$inferSelect)[] = [];
  let error: string | null = null;

  if (configured) {
    try {
      cases = await getDb()
        .select()
        .from(casesTable)
        .orderBy(desc(casesTable.createdAt));
    } catch (err) {
      error = err instanceof Error ? err.message : "Unknown error";
    }
  }

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-foreground">
          {t("cases")}
        </h1>
        <Link href="/" className="text-sm text-muted-foreground underline">
          &larr; {t("dashboard")}
        </Link>
      </div>

      {!configured && <DatabaseNotConfigured />}

      {configured && error && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Could not load cases: {error}. Make sure the Drizzle migration has
          run against your Neon database.
        </p>
      )}

      {!error && cases.length === 0 && configured && (
        <p className="text-muted-foreground">No cases yet.</p>
      )}

      {!error && cases.length > 0 && (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
          {cases.map((c) => (
            <li key={c.id} className="flex flex-col gap-1 p-4">
              <span className="font-medium text-foreground">{c.title}</span>
              <span className="text-sm text-muted-foreground">
                {tService(c.serviceType)} · {c.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
