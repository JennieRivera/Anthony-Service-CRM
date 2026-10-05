import { Phone, Scale } from "lucide-react";
import { businessInfo } from "@/lib/business-info";
import { bothLanguages, type LegalText } from "@/lib/legal/keys";

// Footer of every public and client-facing page: the "not a law firm"
// notice, the Florida §117.05(10) notary disclosure (always in English AND
// Spanish together, same size as the footer text — never smaller), and the
// phone. The only place the disclosure is rendered, so it shows once per page.
// Texts come from Settings → Legal texts.
export function LegalFooter({
  notALawFirm,
  floridaNotaryDisclosure,
  questionsLabel,
}: {
  notALawFirm: string;
  floridaNotaryDisclosure: LegalText;
  questionsLabel: string;
}) {
  const disclosure = bothLanguages(floridaNotaryDisclosure);
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 py-5 text-sm text-muted-foreground">
        <p className="flex items-start gap-2">
          <Scale className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{notALawFirm}</span>
        </p>
        {/* §117.05(10) asks for a "conspicuous size": same size as the
            surrounding footer text (never smaller), full-contrast text, in
            a soft box — rendered only here, so once per page. */}
        {disclosure.length > 0 && (
          <div className="flex flex-col gap-1 rounded-lg border border-border bg-secondary/60 p-3 text-foreground">
            {disclosure.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        )}
        <a href={`tel:${businessInfo.phone.replace(/\D/g, "")}`} className="flex items-center gap-2 underline">
          <Phone className="size-4" aria-hidden />
          {questionsLabel}
        </a>
      </div>
    </footer>
  );
}
