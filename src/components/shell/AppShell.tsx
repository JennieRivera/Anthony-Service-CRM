import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { FloatingCalculator } from "./FloatingCalculator";
import { Miadiamante } from "./Miadiamante";

// Phase 2F — printing a certificate (or any other page) should never
// include the sidebar/topbar/calculator chrome. Wrapping each in its own
// print:hidden div, plus print-friendly overflow on the containers below,
// is the only shell-wide change this needed.
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background print:h-auto print:overflow-visible">
      <div className="print:hidden">
        <Sidebar />
      </div>
      <div className="flex min-w-0 flex-1 flex-col print:overflow-visible">
        <div className="print:hidden">
          <Topbar />
        </div>
        <main className="flex-1 overflow-y-auto print:overflow-visible">{children}</main>
      </div>
      <div className="print:hidden">
        <FloatingCalculator />
        <Miadiamante />
      </div>
    </div>
  );
}
