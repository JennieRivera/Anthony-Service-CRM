"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

// Shared body of the error and not-found screens. Client component so it
// works inside error.tsx boundaries, which must be client components.
function FallbackLayout({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="flex w-full flex-1 flex-col items-center justify-center gap-3 px-8 py-16 text-center">
      <h1 className="font-heading text-2xl text-foreground">{title}</h1>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">{children}</div>
    </div>
  );
}

export function ErrorFallback({
  digest,
  onRetry,
}: {
  digest?: string;
  onRetry: () => void;
}) {
  const t = useTranslations("ErrorPages");
  return (
    <FallbackLayout title={t("errorTitle")} description={t("errorDescription")}>
      <Button type="button" onClick={onRetry}>
        {t("retry")}
      </Button>
      <Button variant="outline" render={<Link href="/" />}>
        {t("goHome")}
      </Button>
      {digest && (
        <p className="w-full pt-2 text-xs text-muted-foreground">
          {t("errorCode", { code: digest })}
        </p>
      )}
    </FallbackLayout>
  );
}

export function NotFoundFallback() {
  const t = useTranslations("ErrorPages");
  return (
    <FallbackLayout title={t("notFoundTitle")} description={t("notFoundDescription")}>
      <Button variant="outline" render={<Link href="/" />}>
        {t("goHome")}
      </Button>
    </FallbackLayout>
  );
}
