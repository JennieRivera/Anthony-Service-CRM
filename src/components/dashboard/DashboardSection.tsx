import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";

export function DashboardSection({
  title,
  viewAllHref,
  viewAllLabel,
  children,
}: {
  title: string;
  viewAllHref?: string;
  viewAllLabel?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg text-foreground">{title}</h2>
        {viewAllHref && viewAllLabel && (
          <Link
            href={viewAllHref}
            className="text-sm text-muted-foreground hover:underline"
          >
            {viewAllLabel} &rarr;
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}
