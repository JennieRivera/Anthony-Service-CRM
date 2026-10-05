import type { Metadata } from "next";
import { connection } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ShieldCheck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { isDatabaseConfigured } from "@/lib/db/config";
import { getDb } from "@/lib/db";
import { businessInfo } from "@/lib/business-info";
import { DEFAULT_LEGAL_TEXTS, getLegalTexts, pickLocale } from "@/lib/legal/texts";
import type { PortalDb } from "@/lib/portal/db";
import { LegalFooter } from "@/components/portal/LegalFooter";

// PUBLIC page — the Privacy Notice (see isPublicPath in src/proxy.ts).
// Outside the (app) route group: no AppShell, no staff navigation. The
// text is edited in Settings → Legal texts; the default is only a draft
// and must be reviewed by an attorney.

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Privacy" });
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

type Block = { kind: "heading" | "paragraph"; text: string } | { kind: "list"; items: string[] };

// Plain text → blocks: blank lines split blocks, "## " starts a heading,
// lines starting with "- " form a list. Rendered as text only (no HTML).
function toBlocks(text: string): Block[] {
  return text
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .flatMap((chunk): Block[] => {
      if (chunk.startsWith("## ")) {
        const [heading, ...rest] = chunk.split("\n");
        const blocks: Block[] = [{ kind: "heading", text: heading.slice(3).trim() }];
        return rest.length ? [...blocks, ...toBlocks(rest.join("\n"))] : blocks;
      }
      const lines = chunk.split("\n").map((l) => l.trim());
      if (lines.every((l) => l.startsWith("- "))) return [{ kind: "list", items: lines.map((l) => l.slice(2)) }];
      return [{ kind: "paragraph", text: lines.join(" ") }];
    });
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  // The text is admin-editable, so never prerender this page.
  await connection();

  const t = await getTranslations("Privacy");
  const tPortal = await getTranslations("Portal");
  const texts = isDatabaseConfigured() ? await getLegalTexts(getDb() as unknown as PortalDb) : DEFAULT_LEGAL_TEXTS;
  const blocks = toBlocks(pickLocale(texts.privacy_notice, locale));

  return (
    <div className="flex min-h-full flex-1 flex-col bg-secondary/40">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <ShieldCheck className="size-5" aria-hidden />
            </span>
            <span className="font-heading text-lg leading-tight text-foreground">Anthony Multiservice</span>
          </div>
          <Link
            href="/privacy"
            locale={locale === "es" ? "en" : "es"}
            className="rounded-full border border-border px-3 py-1.5 text-sm text-foreground hover:bg-secondary"
          >
            {locale === "es" ? "English" : "Español"}
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-6">
        <h1 className="font-heading text-2xl text-foreground sm:text-3xl">{t("title")}</h1>
        <article className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 text-foreground sm:p-6">
          {blocks.map((block, i) =>
            block.kind === "heading" ? (
              <h2 key={i} className="pt-2 text-lg font-semibold text-foreground">
                {block.text}
              </h2>
            ) : block.kind === "list" ? (
              <ul key={i} className="flex list-disc flex-col gap-1 pl-5">
                {block.items.map((item, j) => (
                  <li key={j}>{item}</li>
                ))}
              </ul>
            ) : (
              <p key={i}>{block.text}</p>
            ),
          )}
        </article>
      </main>

      <LegalFooter
        notALawFirm={pickLocale(texts.not_a_law_firm, locale)}
        floridaNotaryDisclosure={texts.florida_notary_disclosure}
        questionsLabel={tPortal("questions", { phone: businessInfo.phone })}
      />
    </div>
  );
}
