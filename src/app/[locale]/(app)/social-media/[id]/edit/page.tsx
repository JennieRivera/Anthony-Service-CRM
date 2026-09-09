import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SocialMediaContentForm } from "@/components/social-media/SocialMediaContentForm";
import {
  getSocialMediaContentById,
  listMarketingContentAssetsForSelect,
} from "@/lib/queries/socialMedia";
import { updateSocialMediaContentAction } from "../../actions";
import type { SocialMediaContentFormValues } from "@/lib/validation/socialMedia";

export default async function EditSocialMediaContentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("SocialMedia");
  const [result, mediaAssets] = await Promise.all([
    getSocialMediaContentById(id),
    listMarketingContentAssetsForSelect(),
  ]);

  if (!result) notFound();

  async function submit(values: SocialMediaContentFormValues) {
    "use server";
    await updateSocialMediaContentAction(id, values);
  }

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-10">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-foreground">
          {t("editContent")}
        </h1>
        <Link
          href={`/social-media/${id}`}
          className="text-sm text-muted-foreground underline"
        >
          &larr; {t("backToContent")}
        </Link>
      </div>

      <SocialMediaContentForm
        content={result.content}
        mediaAssets={mediaAssets}
        onSubmit={submit}
      />
    </div>
  );
}
