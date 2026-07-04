import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const t = await getTranslations("HomePage");

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-16 py-16 text-center">
      <div className="flex flex-col gap-3">
        <h1 className="font-heading text-3xl tracking-tight text-foreground">
          {t("title")}
        </h1>
        <p className="max-w-md text-lg leading-8 text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>
      <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
        <Button size="lg" render={<Link href="/clients" />}>
          {t("clientsCta")}
        </Button>
        <Button size="lg" variant="outline" render={<Link href="/cases" />}>
          {t("casesCta")}
        </Button>
      </div>
    </div>
  );
}
