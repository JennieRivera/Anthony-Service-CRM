import { CheckCircle2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { isDatabaseConfigured } from "@/lib/db/config";
import { listOpenTasks } from "@/lib/queries/tasks";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import DatabaseNotConfigured from "@/components/DatabaseNotConfigured";
import { markTaskDoneAction } from "./actions";

export default async function TasksPage() {
  const t = await getTranslations("Tasks");
  const tType = await getTranslations("TaskType");
  const configured = isDatabaseConfigured();

  let openTasks: Awaited<ReturnType<typeof listOpenTasks>> = [];
  let error: string | null = null;

  if (configured) {
    try {
      openTasks = await listOpenTasks();
    } catch (err) {
      error = err instanceof Error ? err.message : "Unknown error";
    }
  }

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-foreground">
          {t("title")}
        </h1>
      </div>

      {!configured && <DatabaseNotConfigured />}

      {configured && error && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Could not load tasks: {error}.
        </p>
      )}

      {configured && !error && (
        <>
          {openTasks.length === 0 ? (
            <p className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
              {t("empty")}
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("columnType")}</TableHead>
                    <TableHead>{t("columnTitle")}</TableHead>
                    <TableHead>{t("columnClient")}</TableHead>
                    <TableHead>{t("columnCase")}</TableHead>
                    <TableHead>{t("columnDueDate")}</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {openTasks.map((task) => {
                    async function completeTask() {
                      "use server";
                      await markTaskDoneAction(task.id);
                    }

                    return (
                      <TableRow key={task.id}>
                        <TableCell>
                          <Badge variant="outline">{tType(task.type)}</Badge>
                        </TableCell>
                        <TableCell className="text-foreground">
                          {task.title}
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/clients/${task.clientId}`}
                            className="text-muted-foreground hover:underline"
                          >
                            {task.clientName}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {task.caseId ? (
                            <Link
                              href={`/cases/${task.caseId}`}
                              className="text-muted-foreground hover:underline"
                            >
                              {task.caseTitle}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {task.dueDate
                            ? new Date(task.dueDate).toLocaleDateString()
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <form action={completeTask}>
                            <Button type="submit" size="sm" variant="outline">
                              <CheckCircle2 className="h-4 w-4" />
                              {t("markDone")}
                            </Button>
                          </form>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
