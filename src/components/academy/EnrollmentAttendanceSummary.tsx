import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/dates";

const attendanceStatusClasses: Record<string, string> = {
  present: "border-transparent bg-success text-success-foreground",
  late: "border-transparent bg-info text-info-foreground",
  absent: "border-transparent bg-destructive/10 text-destructive",
  excused: "border-border text-muted-foreground bg-transparent",
};

export async function EnrollmentAttendanceSummary({
  percentage,
  present,
  late,
  absent,
  excused,
  recentSessions,
}: {
  percentage: number | null;
  present: number;
  late: number;
  absent: number;
  excused: number;
  recentSessions: {
    sessionId: string;
    sessionDate: string;
    sessionTitle: string | null;
    attendanceStatus: "present" | "absent" | "excused" | "late";
  }[];
}) {
  const t = await getTranslations("AcademyAttendance");
  const tStatus = await getTranslations("AcademyAttendanceStatus");

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading text-lg text-foreground">{t("title")}</h2>
        <span className="font-heading text-2xl text-foreground">
          {percentage != null ? `${percentage}%` : "—"}
        </span>
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <span className="text-foreground">
          {tStatus("present")}: <span className="font-medium">{present}</span>
        </span>
        <span className="text-foreground">
          {tStatus("late")}: <span className="font-medium">{late}</span>
        </span>
        <span className="text-foreground">
          {tStatus("absent")}: <span className="font-medium">{absent}</span>
        </span>
        <span className="text-foreground">
          {tStatus("excused")}: <span className="font-medium">{excused}</span>
        </span>
      </div>

      {recentSessions.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noSessionsRecorded")}</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs text-muted-foreground">{t("recentSessions")}</p>
          {recentSessions.map((s) => (
            <div key={s.sessionId} className="flex items-center justify-between gap-2 text-sm">
              <span className="text-foreground">
                {formatDate(s.sessionDate)}
                {s.sessionTitle ? ` — ${s.sessionTitle}` : ""}
              </span>
              <Badge className={cn(attendanceStatusClasses[s.attendanceStatus])}>
                {tStatus(s.attendanceStatus)}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
