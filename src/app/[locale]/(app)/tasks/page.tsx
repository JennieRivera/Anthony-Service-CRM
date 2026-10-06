import { getTranslations } from "next-intl/server";
import { isDatabaseConfigured } from "@/lib/db/config";
import { listTaskBoard } from "@/lib/queries/taskBoard";
import { businessDateString } from "@/lib/dates";
import DatabaseNotConfigured from "@/components/DatabaseNotConfigured";
import { TaskBoard } from "@/components/tasks/TaskBoard";

export default async function TasksPage() {
  const t = await getTranslations("Tasks");
  const configured = isDatabaseConfigured();

  let openTasks: Awaited<ReturnType<typeof listTaskBoard>> = [];
  let error: string | null = null;

  if (configured) {
    try {
      openTasks = await listTaskBoard();
    } catch (err) {
      error = err instanceof Error ? err.message : "Unknown error";
    }
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-6 px-8 py-10">
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
            <TaskBoard tasks={openTasks} today={businessDateString()} />
          )}
        </>
      )}
    </div>
  );
}
