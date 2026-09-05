import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--sidebar-primary)] font-heading text-xs text-[var(--sidebar-primary)]">
        AMS
      </span>
      <span className="font-heading text-base leading-tight text-[var(--sidebar-foreground)]">
        Anthony Multiservice
      </span>
    </div>
  );
}
