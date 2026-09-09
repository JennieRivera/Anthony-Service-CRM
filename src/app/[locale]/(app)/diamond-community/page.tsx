import { getTranslations } from "next-intl/server";
import { isDatabaseConfigured } from "@/lib/db/config";
import {
  listDiamondMembers,
  listAcademyStudentsForSelect,
} from "@/lib/queries/academyDiamond";
import { DiamondCommunityManager } from "@/components/academy/DiamondCommunityManager";
import DatabaseNotConfigured from "@/components/DatabaseNotConfigured";

// Diamond Community — a VIP WhatsApp roster (admin + students +
// teachers), exclusive to Academy. Deliberately separate from
// /community (Alliances/Associations) and from /communications: see the
// comment on academyDiamondMembers in schema.ts for why this is a
// membership roster, not a message log.
export default async function DiamondCommunityPage() {
  const t = await getTranslations("DiamondCommunity");
  const configured = isDatabaseConfigured();

  let members: Awaited<ReturnType<typeof listDiamondMembers>> = [];
  let students: Awaited<ReturnType<typeof listAcademyStudentsForSelect>> = [];
  let error: string | null = null;

  if (configured) {
    try {
      [members, students] = await Promise.all([
        listDiamondMembers(),
        listAcademyStudentsForSelect(),
      ]);
    } catch (err) {
      error = err instanceof Error ? err.message : "Unknown error";
    }
  }

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <h1 className="font-heading text-2xl text-foreground">{t("title")}</h1>

      {!configured && <DatabaseNotConfigured />}

      {configured && error && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Could not load Diamond Community: {error}.
        </p>
      )}

      {configured && !error && (
        <DiamondCommunityManager members={members} students={students} />
      )}
    </div>
  );
}
