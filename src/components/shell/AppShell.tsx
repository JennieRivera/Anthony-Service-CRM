import type { ReactNode } from "react";
import { auth } from "@/auth";
import { getVisibleNavHrefs } from "./nav-items";
import type { Role } from "@/lib/permissions";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export async function AppShell({ children }: { children: ReactNode }) {
  const session = await auth();
  const role = (session?.user?.role ?? null) as Role | null;
  const visibleHrefs = getVisibleNavHrefs(role);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar visibleHrefs={visibleHrefs} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar visibleHrefs={visibleHrefs} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
