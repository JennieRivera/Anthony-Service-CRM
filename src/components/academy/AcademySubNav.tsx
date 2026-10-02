import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

// Phase 2B — sub-navigation under Academy itself (Students/Instructors/
// Mentors), rather than adding more top-level sidebar/drawer entries. Each
// tab is a real route, so this renders server-side with the active tab
// known from the page, no client-side pathname matching needed.
export async function AcademySubNav({
  active,
}: {
  active: "students" | "instructors" | "mentors";
}) {
  const t = await getTranslations("Academy");

  const tabs = [
    { key: "students" as const, href: "/academy", label: t("navStudents") },
    { key: "instructors" as const, href: "/academy/instructors", label: t("navInstructors") },
    { key: "mentors" as const, href: "/academy/mentors", label: t("navMentors") },
  ];

  return (
    <div className="flex gap-1 border-b border-border">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={cn(
            "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
            active === tab.key
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
