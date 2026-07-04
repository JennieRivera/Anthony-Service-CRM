import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import LocaleSwitcher from "@/components/LocaleSwitcher";
import SignOutButton from "@/components/SignOutButton";
import { auth } from "@/auth";

export default async function Home() {
  const t = await getTranslations("HomePage");
  const session = await auth();

  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black">
      <header className="flex w-full max-w-3xl items-center justify-between p-4">
        <span className="text-sm text-zinc-600 dark:text-zinc-400">
          {session?.user?.email}
        </span>
        <div className="flex items-center gap-4">
          <LocaleSwitcher />
          <SignOutButton />
        </div>
      </header>
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-center gap-8 px-16 py-16 text-center">
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
            {t("title")}
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            {t("subtitle")}
          </p>
        </div>
        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          <Link
            href="/contacts"
            className="flex h-12 items-center justify-center rounded-full bg-foreground px-6 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
          >
            {t("contactsCta")}
          </Link>
          <Link
            href="/deals"
            className="flex h-12 items-center justify-center rounded-full border border-solid border-black/[.08] px-6 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
          >
            {t("dealsCta")}
          </Link>
        </div>
      </main>
    </div>
  );
}
