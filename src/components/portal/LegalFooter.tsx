import { Phone, Scale } from "lucide-react";
import { businessInfo } from "@/lib/business-info";

// "Not a law firm" notice (+ the Florida notary disclosure once an
// attorney has supplied it in Settings) for the footer of every public and
// client-facing page. Texts come from Settings → Legal texts.
export function LegalFooter({
  notALawFirm,
  floridaNotaryDisclosure,
  questionsLabel,
}: {
  notALawFirm: string;
  floridaNotaryDisclosure?: string;
  questionsLabel: string;
}) {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 py-5 text-sm text-muted-foreground">
        <p className="flex items-start gap-2">
          <Scale className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{notALawFirm}</span>
        </p>
        {floridaNotaryDisclosure && <p className="whitespace-pre-line">{floridaNotaryDisclosure}</p>}
        <a href={`tel:${businessInfo.phone.replace(/\D/g, "")}`} className="flex items-center gap-2 underline">
          <Phone className="size-4" aria-hidden />
          {questionsLabel}
        </a>
      </div>
    </footer>
  );
}
