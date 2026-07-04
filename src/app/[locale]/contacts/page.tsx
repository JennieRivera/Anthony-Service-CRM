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
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-3xl flex-1 flex-col gap-6 px-8 py-16">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
            {t("contacts")}
          </h1>
          <Link href="/" className="text-sm underline">
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
          <p className="text-zinc-600 dark:text-zinc-400">No contacts yet.</p>
        )}

        {!error && contacts.length > 0 && (
          <ul className="flex flex-col divide-y divide-black/[.08] rounded-lg border border-black/[.08] dark:divide-white/[.145] dark:border-white/[.145]">
            {contacts.map((contact) => (
              <li key={contact.id} className="flex flex-col gap-1 p-4">
                <span className="font-medium text-black dark:text-zinc-50">
                  {contact.fullName}
                </span>
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  {contact.email ?? "—"} · {contact.phone ?? "—"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
