import { desc } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { getDb } from "@/lib/db";
import { contacts as contactsTable } from "@/lib/db/schema";
import { isDatabaseConfigured } from "@/lib/db/config";
import { Link } from "@/i18n/navigation";
import DatabaseNotConfigured from "@/components/DatabaseNotConfigured";

export default async function ContactsPage() {
  const t = await getTranslations("Nav");
  const configured = isDatabaseConfigured();

  let contacts: (typeof contactsTable.$inferSelect)[] = [];
  let error: string | null = null;

  if (configured) {
    try {
      contacts = await getDb()
        .select()
        .from(contactsTable)
        .orderBy(desc(contactsTable.createdAt));
    } catch (err) {
      error = err instanceof Error ? err.message : "Unknown error";
    }
  }

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-foreground">
          {t("contacts")}
        </h1>
        <Link href="/" className="text-sm text-muted-foreground underline">
          &larr; {t("dashboard")}
        </Link>
      </div>

      {!configured && <DatabaseNotConfigured />}

      {configured && error && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Could not load contacts: {error}. Make sure the Drizzle migration
          has run against your Neon database.
        </p>
      )}

      {!error && contacts.length === 0 && configured && (
        <p className="text-muted-foreground">No contacts yet.</p>
      )}

      {!error && contacts.length > 0 && (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
          {contacts.map((contact) => (
            <li key={contact.id} className="flex flex-col gap-1 p-4">
              <span className="font-medium text-foreground">
                {contact.fullName}
              </span>
              <span className="text-sm text-muted-foreground">
                {contact.email ?? "—"} · {contact.phone ?? "—"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
