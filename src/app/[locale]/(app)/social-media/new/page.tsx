import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SocialMediaContentForm } from "@/components/social-media/SocialMediaContentForm";
import { listMarketingContentAssetsForSelect } from "@/lib/queries/socialMedia";
import { createSocialMediaContentAction } from "../actions";

export default async function NewSocialMediaContentPage() {
  const t = await getTranslations("SocialMedia");
  const mediaAssets = await listMarketingContentAssetsForSelect();

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-foreground">{t("newContent")}</h1>
        <Link href="/social-media" className="text-sm text-muted-foreground underline">
          &larr; {t("backToSocialMedia")}
        </Link>
      </div>

      <SocialMediaContentForm
        mediaAssets={mediaAssets}
        onSubmit={createSocialMediaContentAction}
      />
    </div>
  );
}
