"use client";

import { useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { List } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CHANNEL_META, type Channel } from "./channelMeta";

export type CommunicationsTab = {
  value: string;
  label: string;
  // null = the all-channels log.
  channel: Channel | null;
  count: number;
  content: ReactNode;
};

// The Communications page's channel tabs. The open tab lives in ?tab= so
// the filters (which also live in the URL) keep it, and a link can open a
// tab directly.
export function CommunicationsTabs({ tabs, initial }: { tabs: CommunicationsTab[]; initial: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(tabs.some((tab) => tab.value === initial) ? initial : tabs[0].value);

  function change(next: string) {
    setValue(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next === tabs[0].value) params.delete("tab");
    else params.set("tab", next);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <Tabs value={value} onValueChange={(v) => change(String(v))}>
      <TabsList className="h-auto max-w-full flex-wrap justify-start group-data-horizontal/tabs:h-auto">
        {tabs.map((tab) => {
          const meta = tab.channel ? CHANNEL_META[tab.channel] : null;
          const Icon = meta?.icon ?? List;
          return (
            <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5">
              <Icon className={`h-4 w-4 ${meta?.color ?? ""}`} aria-hidden />
              {tab.label}
              <span className="rounded-full bg-muted px-1.5 text-xs text-muted-foreground tabular-nums">{tab.count}</span>
            </TabsTrigger>
          );
        })}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent key={tab.value} value={tab.value} className="flex flex-col gap-4 pt-4">
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
