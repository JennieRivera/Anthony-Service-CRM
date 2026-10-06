import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { isDatabaseConfigured } from "@/lib/db/config";
import {
  listCommunicationsWithClient,
  type CommunicationListFilters,
} from "@/lib/queries/communications";
import { listClientsForSelect } from "@/lib/queries/cases";
import {
  listFacebookThreads,
  listInstagramThreads,
  listWebsiteChatSessions,
} from "@/lib/queries/socialChannels";
import { communicationStatusValues } from "@/lib/validation/communication";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { CommunicationTable } from "@/components/communications/CommunicationTable";
import { CommunicationFilters } from "@/components/communications/CommunicationFilters";
import {
  CommunicationsTabs,
  type CommunicationsTab,
} from "@/components/communications/CommunicationsTabs";
import type { Channel } from "@/components/communications/channelMeta";
import { FacebookThreadsSection } from "@/components/communications/FacebookThreadsSection";
import { InstagramThreadsSection } from "@/components/communications/InstagramThreadsSection";
import { WebsiteChatSection } from "@/components/communications/WebsiteChatSection";
import DatabaseNotConfigured from "@/components/DatabaseNotConfigured";

// Channel tabs, in display order. "manual" = a social network with no API
// connection yet (logged by hand); "automatic" = also receives the
// automatic notices the CRM sends.
const CHANNEL_TABS: { channel: Channel; note: "manual" | "automatic" | null }[] = [
  { channel: "whatsapp", note: "manual" },
  { channel: "email", note: "automatic" },
  { channel: "sms", note: "automatic" },
  { channel: "call", note: null },
  { channel: "in_person", note: null },
  { channel: "google_business", note: "manual" },
  { channel: "tiktok", note: "manual" },
  { channel: "linkedin", note: "manual" },
  { channel: "youtube", note: "manual" },
];

export default async function CommunicationsPage({
  searchParams,
}: {
  searchParams: Promise<CommunicationListFilters & { tab?: string }>;
}) {
  const t = await getTranslations("Communications");
  const tSocial = await getTranslations("SocialChannels");
  const tChannel = await getTranslations("ConversationChannel");
  const configured = isDatabaseConfigured();
  const { tab, channel: _channel, ...filters } = await searchParams;
  void _channel;

  let communications: Awaited<ReturnType<typeof listCommunicationsWithClient>> = [];
  let clients: Awaited<ReturnType<typeof listClientsForSelect>> = [];
  let threadCounts = { facebook: 0, instagram: 0, websiteChat: 0 };
  let error: string | null = null;

  if (configured) {
    try {
      const [rows, clientRows, fb, ig, chat] = await Promise.all([
        listCommunicationsWithClient(filters),
        listClientsForSelect(),
        listFacebookThreads(),
        listInstagramThreads(),
        listWebsiteChatSessions(),
      ]);
      communications = rows;
      clients = clientRows;
      threadCounts = { facebook: fb.length, instagram: ig.length, websiteChat: chat.length };
    } catch (err) {
      error = err instanceof Error ? err.message : "Unknown error";
    }
  }

  const list = (rows: typeof communications) =>
    error ? (
      <p className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        Could not load communications: {error}.
      </p>
    ) : rows.length === 0 ? (
      <p className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
        {t("empty")}
      </p>
    ) : (
      <CommunicationTable communications={rows} />
    );

  const registerButton = (channel?: Channel) => (
    <Button render={<Link href={channel ? `/communications/new?channel=${channel}` : "/communications/new"} />}>
      <Plus className="h-4 w-4" />
      {channel ? t("register") : t("newCommunication")}
    </Button>
  );

  const tabs: CommunicationsTab[] = [
    {
      value: "log",
      label: tSocial("tabLog"),
      channel: null,
      count: communications.length,
      content: (
        <>
          <div className="flex items-center justify-end">{registerButton()}</div>
          {list(communications)}
        </>
      ),
    },
    ...CHANNEL_TABS.map(({ channel, note }) => {
      const rows = communications.filter((c) => c.channel === channel);
      return {
        value: channel,
        label: tChannel(channel),
        channel,
        count: rows.length,
        content: (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {note === "manual" ? t("manualForNow") : note === "automatic" ? t("automaticHere") : ""}
              </p>
              {registerButton(channel)}
            </div>
            {list(rows)}
          </>
        ),
      };
    }),
    {
      value: "facebook",
      label: tSocial("tabFacebook"),
      channel: "facebook_messenger",
      count: threadCounts.facebook,
      content: <FacebookThreadsSection />,
    },
    {
      value: "instagram",
      label: tSocial("tabInstagram"),
      channel: "instagram_dm",
      count: threadCounts.instagram,
      content: <InstagramThreadsSection />,
    },
    {
      value: "website_chat",
      label: tSocial("tabWebsiteChat"),
      channel: "website_chat",
      count: threadCounts.websiteChat,
      content: <WebsiteChatSection />,
    },
  ];

  return (
    <div className="flex w-full min-w-0 flex-col gap-6 px-8 py-10">
      <h1 className="font-heading text-2xl text-foreground">{t("title")}</h1>

      {!configured && <DatabaseNotConfigured />}

      {configured && (
        <>
          <CommunicationFilters
            clients={clients}
            statuses={communicationStatusValues}
            activeFilters={filters}
          />
          <CommunicationsTabs tabs={tabs} initial={tab ?? "log"} />
        </>
      )}
    </div>
  );
}
