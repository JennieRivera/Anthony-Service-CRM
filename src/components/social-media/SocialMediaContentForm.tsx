"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  socialMediaContentFormSchema,
  socialMediaPlatformValues,
  socialContentTypeValues,
  socialContentStatusValues,
  socialPerformanceStatusValues,
  socialPartnerApprovalStatusValues,
  socialContentLanguageValues,
  type SocialMediaContentFormValues,
} from "@/lib/validation/socialMedia";
import { serviceTypeValues } from "@/lib/validation/client";
import type { SocialMediaContent } from "@/lib/db/schema";

export function SocialMediaContentForm({
  content,
  mediaAssets,
  onSubmit,
}: {
  content?: SocialMediaContent;
  mediaAssets: { id: string; fileName: string }[];
  onSubmit: (values: SocialMediaContentFormValues) => Promise<void>;
}) {
  const t = useTranslations("SocialMedia.form");
  const tPlatform = useTranslations("SocialMediaPlatform");
  const tContentType = useTranslations("SocialContentType");
  const tStatus = useTranslations("SocialContentStatus");
  const tPerformance = useTranslations("SocialPerformanceStatus");
  const tPartnerApproval = useTranslations("SocialPartnerApprovalStatus");
  const tService = useTranslations("ServiceType");
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<SocialMediaContentFormValues>({
    resolver: zodResolver(socialMediaContentFormSchema),
    defaultValues: {
      title: content?.title ?? "",
      platform: content?.platform ?? "facebook",
      contentType: content?.contentType ?? "image",
      campaign: content?.campaign ?? "",
      brand: content?.brand ?? "",
      serviceType: content?.serviceType ?? "",
      audience: content?.audience ?? "",
      language: (content?.language as "en" | "es" | undefined) ?? "",
      caption: content?.caption ?? "",
      hashtags: content?.hashtags ?? "",
      callToAction: content?.callToAction ?? "",
      mediaAssetId: content?.mediaAssetId ?? "",
      status: content?.status ?? "idea",
      scheduledDate: content?.scheduledDate ?? "",
      publishedDate: content?.publishedDate ?? "",
      postUrl: content?.postUrl ?? "",
      performanceStatus: content?.performanceStatus ?? "not_tracked",
      approvalRequired: content?.approvalRequired ?? false,
      approvedBy: content?.approvedBy ?? "",
      approvalDate: content?.approvalDate ?? "",
      partnerApprovalRequired: content?.partnerApprovalRequired ?? false,
      partnerApprovalStatus: content?.partnerApprovalStatus ?? "not_required",
      notes: content?.notes ?? "",
    },
  });

  const approvalRequired = watch("approvalRequired");
  const partnerApprovalRequired = watch("partnerApprovalRequired");
  const statusError = errors.status;

  async function submit(values: SocialMediaContentFormValues) {
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      if (
        err &&
        typeof err === "object" &&
        "digest" in err &&
        typeof (err as { digest?: unknown }).digest === "string" &&
        (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
      ) {
        throw err;
      }
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit(submit)}
      className="flex flex-col gap-6 rounded-lg border border-border bg-card p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="title">{t("title")}</Label>
          <Input id="title" {...register("title")} />
          {errors.title && (
            <p className="text-sm text-destructive">{errors.title.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>{t("platform")}</Label>
          <Controller
            control={control}
            name="platform"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {socialMediaPlatformValues.map((value) => (
                    <SelectItem key={value} value={value}>
                      {tPlatform(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>{t("contentType")}</Label>
          <Controller
            control={control}
            name="contentType"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {socialContentTypeValues.map((value) => (
                    <SelectItem key={value} value={value}>
                      {tContentType(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="campaign">{t("campaign")}</Label>
          <Input id="campaign" {...register("campaign")} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="brand">{t("brand")}</Label>
          <Input id="brand" placeholder={t("brandPlaceholder")} {...register("brand")} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>{t("serviceType")}</Label>
          <Controller
            control={control}
            name="serviceType"
            render={({ field }) => (
              <Select
                value={field.value || "none"}
                onValueChange={(value) =>
                  field.onChange(value === "none" ? "" : value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("generalService")}</SelectItem>
                  {serviceTypeValues.map((value) => (
                    <SelectItem key={value} value={value}>
                      {tService(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="audience">{t("audience")}</Label>
          <Input id="audience" {...register("audience")} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>{t("language")}</Label>
          <Controller
            control={control}
            name="language"
            render={({ field }) => (
              <Select
                value={field.value || "none"}
                onValueChange={(value) =>
                  field.onChange(value === "none" ? "" : value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {socialContentLanguageValues.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value === "en" ? "English" : "Español"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>{t("mediaAsset")}</Label>
          <Controller
            control={control}
            name="mediaAssetId"
            render={({ field }) => (
              <Select
                value={field.value || "none"}
                onValueChange={(value) =>
                  field.onChange(value === "none" ? "" : value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("noMediaAsset")}</SelectItem>
                  {mediaAssets.map((asset) => (
                    <SelectItem key={asset.id} value={asset.id}>
                      {asset.fileName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>{t("status")}</Label>
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {socialContentStatusValues.map((value) => (
                    <SelectItem key={value} value={value}>
                      {tStatus(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {statusError && (
            <p className="text-sm text-destructive">{statusError.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="scheduledDate">{t("scheduledDate")}</Label>
          <Input id="scheduledDate" type="date" {...register("scheduledDate")} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="publishedDate">{t("publishedDate")}</Label>
          <Input id="publishedDate" type="date" {...register("publishedDate")} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="postUrl">{t("postUrl")}</Label>
          <Input id="postUrl" {...register("postUrl")} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>{t("performanceStatus")}</Label>
          <Controller
            control={control}
            name="performanceStatus"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {socialPerformanceStatusValues.map((value) => (
                    <SelectItem key={value} value={value}>
                      {tPerformance(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="caption">{t("caption")}</Label>
        <Textarea id="caption" rows={3} {...register("caption")} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="hashtags">{t("hashtags")}</Label>
          <Input id="hashtags" placeholder="#taxes #kissimmee" {...register("hashtags")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="callToAction">{t("callToAction")}</Label>
          <Input id="callToAction" {...register("callToAction")} />
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-md border border-border p-4">
        <p className="text-sm text-muted-foreground">{t("approvalHint")}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-2">
            <Controller
              control={control}
              name="approvalRequired"
              render={({ field }) => (
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
            <Label>{t("approvalRequired")}</Label>
          </div>
          <div className="flex items-center gap-2">
            <Controller
              control={control}
              name="partnerApprovalRequired"
              render={({ field }) => (
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
            <Label>{t("partnerApprovalRequired")}</Label>
          </div>

          {approvalRequired && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="approvedBy">{t("approvedBy")}</Label>
                <Input id="approvedBy" {...register("approvedBy")} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="approvalDate">{t("approvalDate")}</Label>
                <Input id="approvalDate" type="date" {...register("approvalDate")} />
              </div>
            </>
          )}

          {partnerApprovalRequired && (
            <div className="flex flex-col gap-1.5">
              <Label>{t("partnerApprovalStatus")}</Label>
              <Controller
                control={control}
                name="partnerApprovalStatus"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {socialPartnerApprovalStatusValues.map((value) => (
                        <SelectItem key={value} value={value}>
                          {tPartnerApproval(value)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">{t("notes")}</Label>
        <Textarea id="notes" rows={3} {...register("notes")} />
      </div>

      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={submitting}
        >
          {t("cancel")}
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? t("saving") : t("save")}
        </Button>
      </div>
    </form>
  );
}
