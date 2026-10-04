import { formatDate } from "@/lib/dates";
import { getTranslations } from "next-intl/server";
import { Bell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import type { listOpenTasks } from "@/lib/queries/tasks";
import { getBookingTitleLocalizer } from "@/lib/booking/titleLocalizer";

export async function FollowUpTasksCard({
  tasks,
}: {
  tasks: Awaited<ReturnType<typeof listOpenTasks>>;
}) {
  const t = await getTranslations("Dashboard");
  const tTaskType = await getTranslations("TaskType");
  const bookingTitle = await getBookingTitleLocalizer();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("followUpTasks")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {tasks.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {t("noFollowUpTasks")}
          </p>
        )}
        {tasks.map((task) => (
          <Link
            key={task.id}
            href={`/clients/${task.clientId}`}
            className="flex items-start gap-3 rounded-md border border-border p-3 transition-colors hover:bg-muted"
          >
            {/* AMS Visual Correction (dashboard icon contrast) — --accent
                is a pale badge/dropdown BACKGROUND wash (#f0e6d0), never
                meant as an icon foreground; at ~1.1:1 against a white card
                it read as nearly invisible. --primary (AMS Professional
                Blue) is the normal-functional-icon color per the brief. */}
            <Bell className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-foreground">
                {bookingTitle(task.title)}
              </span>
              <span className="text-xs text-muted-foreground">
                {task.clientName} · {tTaskType(task.type)}
                {task.dueDate
                  ? ` · ${formatDate(task.dueDate)}`
                  : ""}
              </span>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
