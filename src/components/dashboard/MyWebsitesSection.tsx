import { getTranslations } from "next-intl/server";
import { ExternalLink, Settings } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { WebsiteLink } from "@/lib/db/schema";

export async function MyWebsitesSection({
  websites,
}: {
  websites: WebsiteLink[];
}) {
  const t = await getTranslations("MyWebsites");
  const tStatus = await getTranslations("WebsiteLinkStatus");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t("dashboardTitle")}</CardTitle>
        <Button size="sm" variant="outline" render={<Link href="/settings/websites" />}>
          <Settings className="h-3.5 w-3.5" />
          {t("manage")}
        </Button>
      </CardHeader>
      <CardContent>
        {websites.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noneActive")}</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {websites.map((website) => (
              <a
                key={website.id}
                href={website.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-full flex-col gap-2 rounded-lg border border-border bg-background p-4 transition-colors hover:bg-muted"
              >
                <span className="font-medium text-foreground">
                  {website.name}
                </span>
                <Badge variant="outline" className="w-fit">
                  {tStatus(website.status)}
                </Badge>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <ExternalLink className="h-3 w-3" />
                  {t("openWebsite")}
                </span>
              </a>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
