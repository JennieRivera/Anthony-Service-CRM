"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";

// The alliance's business photos (its own, private), with remove.
export function PartnerGallery({ photos }: { photos: { id: string; fileName: string }[] }) {
  const t = useTranslations("Partners.profile");
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function remove(id: string) {
    setBusy(id);
    await fetch(`/api/partners/photos/${id}`, { method: "DELETE" }).catch(() => undefined);
    setBusy(null);
    router.refresh();
  }

  if (photos.length === 0) return <p className="text-sm text-muted-foreground">{t("noPhotos")}</p>;
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {photos.map((p) => (
        <li key={p.id} className="relative overflow-hidden rounded-lg border border-border bg-card">
          {/* Private photo streamed by our API route after the session check. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/partners/photos/${p.id}`} alt={p.fileName} className="aspect-square w-full object-cover" />
          <button
            type="button"
            onClick={() => remove(p.id)}
            disabled={busy === p.id}
            className="absolute top-1.5 right-1.5 flex size-9 items-center justify-center rounded-full bg-card/90 text-destructive shadow"
            aria-label={t("removePhoto")}
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
}
