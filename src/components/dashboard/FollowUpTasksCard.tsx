import { getTranslations } from "next-intl/server";
import { Bell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import type { listOpenTasks } from "@/lib/queries/tasks";

export async function FollowUpTasksCard({
  tasks,
}: {
  tasks: Awaited<ReturnType<typeof listOpenTasks>>;
}) {
  const t = await getTranslations("Dashboard");
  const tTaskType = await getTranslations("TaskType");

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
            <Bell className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <div className="flex flex-col">
              <span className="text-sm font-medium text-foreground">
                {task.title}
              </span>
              <span className="text-xs text-muted-foreground">
                {task.clientName} · {tTaskType(task.type)}
                {task.dueDate
                  ? ` · ${new Date(task.dueDate).toLocaleDateString()}`
                  : ""}
              </span>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
