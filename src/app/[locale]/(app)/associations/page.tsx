import { Plus, X } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { listAssociationsChambers } from "@/lib/queries/associationsChambers";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AssociationTable } from "@/components/associations/AssociationTable";

export default async function AssociationsPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const t = await getTranslations("Associations");
  const { state } = await searchParams;
  const organizations = await listAssociationsChambers(state);

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-foreground">{t("title")}</h1>
        <Button render={<Link href="/associations/new" />}>
          <Plus className="h-4 w-4" />
          {t("newOrganization")}
        </Button>
      </div>

      {state && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {t("filteredByState", { state })}
          </span>
          <Link href="/associations">
            <Badge variant="outline" className="flex items-center gap-1">
              {state}
              <X className="h-3 w-3" />
            </Badge>
          </Link>
        </div>
      )}

      {organizations.length === 0 ? (
        <p className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
          {t("empty")}
        </p>
      ) : (
        <AssociationTable organizations={organizations} />
      )}
    </div>
  );
}
