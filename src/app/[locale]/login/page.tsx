"use client";

import { Suspense } from "react";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";

function LoginForm() {
  const t = useTranslations("Login");
  const searchParams = useSearchParams();
  const hasError = searchParams.get("error") != null;

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-6 rounded-lg border border-black/[.08] p-8 dark:border-white/[.145]">
      <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
        {t("title")}
      </h1>

      {hasError && (
        <p className="text-sm text-red-600 dark:text-red-400">{t("error")}</p>
      )}

      <button
        type="button"
        onClick={() => signIn("google", { callbackUrl: "/" })}
        className="flex h-11 w-full items-center justify-center rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
      >
        {t("googleCta")}
      </button>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
