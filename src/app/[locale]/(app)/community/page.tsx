import { Plus, X } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { isDatabaseConfigured } from "@/lib/db/config";
import { listAlliances } from "@/lib/queries/alliances";
import { listAssociationsChambers } from "@/lib/queries/associationsChambers";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AllianceTable } from "@/components/alliances/AllianceTable";
import { AssociationTable } from "@/components/associations/AssociationTable";
import DatabaseNotConfigured from "@/components/DatabaseNotConfigured";

// SIDEBAR-PLAN.md section 3 — Community & Strategic Alliances is one
// sidebar item, but deliberately does NOT merge the two underlying
// tables: strategicAlliances (Phase 2 — referral/commission partners)
// and associationsChambers (Phase 5 — membership organizations) track
// genuinely different relationship types, and that split was already
// confirmed with the user once (see the comment on associationsChambers
// in schema.ts). This page only unifies the navigation, presenting both
// as tabs under one menu entry.
export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; tab?: string }>;
}) {
  const t = await getTranslations("Community");
  const tAlliances = await getTranslations("Alliances");
  const tAssociations = await getTranslations("Associations");
  const configured = isDatabaseConfigured();
  const { state, tab } = await searchParams;
  const activeTab = tab === "associations" ? "associations" : "alliances";

  let alliances: Awaited<ReturnType<typeof listAlliances>> = [];
  let associations: Awaited<ReturnType<typeof listAssociationsChambers>> = [];
  let error: string | null = null;

  if (configured) {
    try {
      [alliances, associations] = await Promise.all([
        listAlliances(),
        listAssociationsChambers(state),
      ]);
    } catch (err) {
      error = err instanceof Error ? err.message : "Unknown error";
    }
  }

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <h1 className="font-heading text-2xl text-foreground">{t("title")}</h1>

      {!configured && <DatabaseNotConfigured />}

      {configured && error && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Could not load community data: {error}.
        </p>
      )}

      {configured && !error && (
        <Tabs defaultValue={activeTab}>
          <TabsList>
            <TabsTrigger value="alliances">
              {t("tabAlliances")} ({alliances.length})
            </TabsTrigger>
            <TabsTrigger value="associations">
              {t("tabAssociations")} ({associations.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="alliances" className="flex flex-col gap-4 pt-4">
            <div className="flex justify-end">
              <Button render={<Link href="/alliances/new" />}>
                <Plus className="h-4 w-4" />
                {tAlliances("newAlliance")}
              </Button>
            </div>
            {alliances.length === 0 ? (
              <p className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
                {tAlliances("empty")}
              </p>
            ) : (
              <AllianceTable alliances={alliances} />
            )}
          </TabsContent>

          <TabsContent value="associations" className="flex flex-col gap-4 pt-4">
            <div className="flex items-center justify-between">
              {state ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {tAssociations("filteredByState", { state })}
                  </span>
                  <Link href="/community?tab=associations">
                    <Badge variant="outline" className="flex items-center gap-1">
                      {state}
                      <X className="h-3 w-3" />
                    </Badge>
                  </Link>
                </div>
              ) : (
                <span />
              )}
              <Button render={<Link href="/associations/new" />}>
                <Plus className="h-4 w-4" />
                {tAssociations("newOrganization")}
              </Button>
            </div>
            {associations.length === 0 ? (
              <p className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
                {tAssociations("empty")}
              </p>
            ) : (
              <AssociationTable organizations={associations} />
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
