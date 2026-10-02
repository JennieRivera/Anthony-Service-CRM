import { getTranslations } from "next-intl/server";
import { Diamond } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

// Phase 2B — sub-navigation under Academy itself (Students/Instructors/
// Mentors), rather than adding more top-level sidebar/drawer entries. Each
// tab is a real route, so this renders server-side with the active tab
// known from the page, no client-side pathname matching needed.
// Phase 2C — Programs/Courses appended (Modules has no tab of its own;
// it's managed inside a course's own detail page, reached via Courses).
export async function AcademySubNav({
  active,
}: {
  active: "students" | "instructors" | "mentors" | "programs" | "courses" | "certificates";
}) {
  const t = await getTranslations("Academy");

  const tabs = [
    { key: "students" as const, href: "/academy", label: t("navStudents") },
    { key: "instructors" as const, href: "/academy/instructors", label: t("navInstructors") },
    { key: "mentors" as const, href: "/academy/mentors", label: t("navMentors") },
    { key: "programs" as const, href: "/academy/programs", label: t("navPrograms") },
    { key: "courses" as const, href: "/academy/courses", label: t("navCourses") },
    { key: "certificates" as const, href: "/academy/certificates", label: t("navCertificates") },
  ];

  return (
    <div className="flex flex-wrap gap-1 border-b border-border">
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
          {tab.key === "students" && (
            <Diamond
              aria-hidden="true"
              className="diamond-badge-glow ml-1 inline h-3 w-3 align-middle text-[#78B7D0]"
              fill="#FAFCFF"
              strokeWidth={1.5}
            />
          )}
        </Link>
      ))}
    </div>
  );
}
