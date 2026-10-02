import { getTranslations } from "next-intl/server";

// Phase 2H — the shared page-level "you do not have permission" state,
// reused everywhere a page checks hasAccessArea() and finds it false.
// Never decorative: every page that renders this also skipped fetching
// the data it would have shown (see the Phase 2H report, section G).
export default async function AccessDenied() {
  const t = await getTranslations("Permissions");
  return (
    <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-6 text-center text-destructive">
      {t("accessDenied")}
    </p>
  );
}
