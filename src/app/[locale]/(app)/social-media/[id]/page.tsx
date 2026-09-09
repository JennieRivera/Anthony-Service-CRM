import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getSocialMediaContentById } from "@/lib/queries/socialMedia";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SocialContentStatusBadge } from "@/components/social-media/SocialContentStatusBadge";
import { assetViewHref } from "@/components/marketing-content/assetHref";

export default async function SocialMediaContentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("SocialMedia");
  const tPlatform = await getTranslations("SocialMediaPlatform");
  const tContentType = await getTranslations("SocialContentType");
  const tService = await getTranslations("ServiceType");
  const tPerformance = await getTranslations("SocialPerformanceStatus");
  const tPartnerApproval = await getTranslations("SocialPartnerApprovalStatus");

  const result = await getSocialMediaContentById(id);
  if (!result) notFound();

  const { content, mediaFileName } = result;
  const contentNumber = `SM-${String(content.contentSeq).padStart(5, "0")}`;

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <div className="flex items-center justify-between">
        <Link href="/social-media" className="text-sm text-muted-foreground underline">
          &larr; {t("backToSocialMedia")}
        </Link>
        <Button render={<Link href={`/social-media/${id}/edit`} />}>
          <Pencil className="h-4 w-4" />
          {t("editContent")}
        </Button>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-2xl text-foreground">
              {content.title}
            </h1>
            <Badge variant="outline">{contentNumber}</Badge>
          </div>
          <SocialContentStatusBadge status={content.status} />
        </div>

        <div className="grid gap-3 text-sm sm:grid-cols-4">
          <div>
            <p className="text-muted-foreground">{t("form.platform")}</p>
            <p className="text-foreground">{tPlatform(content.platform)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("form.contentType")}</p>
            <p className="text-foreground">{tContentType(content.contentType)}</p>
          </div>
          {content.campaign && (
            <div>
              <p className="text-muted-foreground">{t("form.campaign")}</p>
              <p className="text-foreground">{content.campaign}</p>
            </div>
          )}
          {content.brand && (
            <div>
              <p className="text-muted-foreground">{t("form.brand")}</p>
              <p className="text-foreground">{content.brand}</p>
            </div>
          )}
          {content.serviceType && (
            <div>
              <p className="text-muted-foreground">{t("form.serviceType")}</p>
              <p className="text-foreground">{tService(content.serviceType)}</p>
            </div>
          )}
          {content.audience && (
            <div>
              <p className="text-muted-foreground">{t("form.audience")}</p>
              <p className="text-foreground">{content.audience}</p>
            </div>
          )}
          {content.language && (
            <div>
              <p className="text-muted-foreground">{t("form.language")}</p>
              <p className="text-foreground">
                {content.language === "es" ? "Español" : "English"}
              </p>
            </div>
          )}
          <div>
            <p className="text-muted-foreground">{t("form.scheduledDate")}</p>
            <p className="text-foreground">
              {content.scheduledDate
                ? new Date(content.scheduledDate).toLocaleDateString()
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">{t("form.publishedDate")}</p>
            <p className="text-foreground">
              {content.publishedDate
                ? new Date(content.publishedDate).toLocaleDateString()
                : "—"}
            </p>
          </div>
          {content.postUrl && (
            <div>
              <p className="text-muted-foreground">{t("form.postUrl")}</p>
              <a
                href={content.postUrl}
                target="_blank"
                rel="noreferrer"
                className="text-foreground hover:underline"
              >
                {content.postUrl}
              </a>
            </div>
          )}
          <div>
            <p className="text-muted-foreground">{t("form.performanceStatus")}</p>
            <p className="text-foreground">
              {tPerformance(content.performanceStatus)}
            </p>
          </div>
        </div>
      </div>

      {mediaFileName && (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">{t("form.mediaAsset")}</p>
          <div className="flex aspect-video max-w-md items-center justify-center overflow-hidden rounded-md bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={assetViewHref(content.mediaAssetId!)}
              alt={mediaFileName}
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      )}

      {content.caption && (
        <div className="rounded-lg border border-border bg-card p-6 text-sm">
          <p className="text-muted-foreground">{t("form.caption")}</p>
          <p className="whitespace-pre-wrap text-foreground">{content.caption}</p>
        </div>
      )}

      <div className="grid gap-3 rounded-lg border border-border bg-card p-6 text-sm sm:grid-cols-2">
        <div>
          <p className="text-muted-foreground">{t("form.hashtags")}</p>
          <p className="text-foreground">{content.hashtags ?? "—"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">{t("form.callToAction")}</p>
          <p className="text-foreground">{content.callToAction ?? "—"}</p>
        </div>
      </div>

      <div className="grid gap-3 rounded-lg border border-border bg-card p-6 text-sm sm:grid-cols-4">
        <div>
          <p className="text-muted-foreground">{t("form.approvalRequired")}</p>
          <p className="text-foreground">
            {content.approvalRequired ? "✓" : "—"}
          </p>
        </div>
        {content.approvalRequired && (
          <>
            <div>
              <p className="text-muted-foreground">{t("form.approvedBy")}</p>
              <p className="text-foreground">{content.approvedBy ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("form.approvalDate")}</p>
              <p className="text-foreground">
                {content.approvalDate
                  ? new Date(content.approvalDate).toLocaleDateString()
                  : "—"}
              </p>
            </div>
          </>
        )}
        <div>
          <p className="text-muted-foreground">
            {t("form.partnerApprovalRequired")}
          </p>
          <p className="text-foreground">
            {content.partnerApprovalRequired ? "✓" : "—"}
          </p>
        </div>
        {content.partnerApprovalRequired && (
          <div>
            <p className="text-muted-foreground">
              {t("form.partnerApprovalStatus")}
            </p>
            <p className="text-foreground">
              {tPartnerApproval(content.partnerApprovalStatus)}
            </p>
          </div>
        )}
      </div>

      {content.notes && (
        <div className="rounded-lg border border-border bg-card p-6 text-sm">
          <p className="text-muted-foreground">{t("form.notes")}</p>
          <p className="whitespace-pre-wrap text-foreground">{content.notes}</p>
        </div>
      )}

      <div className="grid gap-3 rounded-lg border border-border bg-card p-6 text-sm sm:grid-cols-3">
        <div>
          <p className="text-muted-foreground">{t("createdBy")}</p>
          <p className="text-foreground">{content.createdByEmail ?? "—"}</p>
        </div>
        <div>
          <p className="text-muted-foreground">{t("createdDate")}</p>
          <p className="text-foreground">
            {new Date(content.createdAt).toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">{t("updatedDate")}</p>
          <p className="text-foreground">
            {new Date(content.updatedAt).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
