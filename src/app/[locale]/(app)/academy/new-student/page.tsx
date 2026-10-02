import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { NewStudentSearch } from "@/components/academy/NewStudentSearch";

// Phase 2A — Master Person Identity Safety Net. Interstitial step between
// Academy's "New Student" button and /cases/new?serviceType=academy: staff
// search for the person first (they may already be a tax/notary/immigration
// client, or even a Diamond Community member) before ever creating a new
// clients row for them.
export default async function AcademyNewStudentPage() {
  const t = await getTranslations("Academy");

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-foreground">{t("newStudent")}</h1>
        <Link href="/academy" className="text-sm text-muted-foreground underline">
          &larr; {t("backToAcademy")}
        </Link>
      </div>

      <NewStudentSearch />
    </div>
  );
}
