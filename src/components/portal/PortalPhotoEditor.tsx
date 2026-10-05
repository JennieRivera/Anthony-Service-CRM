"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Camera, ImageUp, Trash2, UserRound } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  PROFILE_PHOTO_ACCEPT,
  PROFILE_PHOTO_MAX_BYTES,
  PROFILE_PHOTO_SIZE,
  isAllowedProfilePhotoName,
} from "@/lib/portal/photo";

type Crop = { bitmap: ImageBitmap; zoom: number; x: number; y: number };

// Scale so the image always covers the whole square, then clamp the
// offset so no empty edge can show.
function geometry(c: Crop) {
  const scale = (PROFILE_PHOTO_SIZE / Math.min(c.bitmap.width, c.bitmap.height)) * c.zoom;
  const w = c.bitmap.width * scale;
  const h = c.bitmap.height * scale;
  const maxX = (w - PROFILE_PHOTO_SIZE) / 2;
  const maxY = (h - PROFILE_PHOTO_SIZE) / 2;
  const x = Math.max(-maxX, Math.min(maxX, c.x));
  const y = Math.max(-maxY, Math.min(maxY, c.y));
  return { w, h, x, y };
}

// Optional profile photo: pick or take a photo, drag/zoom it inside a
// square, and upload the square only (re-encoded in the browser, which
// also strips EXIF/GPS data). Rules: JPG/PNG/WEBP, up to 5 MB.
export function PortalPhotoEditor({ hasPhoto }: { hasPhoto: boolean }) {
  const t = useTranslations("Portal.profile.photo");
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const [crop, setCrop] = useState<Crop | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx || !crop) return;
    const g = geometry(crop);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, PROFILE_PHOTO_SIZE, PROFILE_PHOTO_SIZE);
    ctx.drawImage(
      crop.bitmap,
      (PROFILE_PHOTO_SIZE - g.w) / 2 + g.x,
      (PROFILE_PHOTO_SIZE - g.h) / 2 + g.y,
      g.w,
      g.h,
    );
  }, [crop]);

  async function pick(list: FileList | null) {
    const file = list?.[0];
    if (fileInput.current) fileInput.current.value = "";
    if (cameraInput.current) cameraInput.current.value = "";
    if (!file) return;
    setError(null);
    if (file.size > PROFILE_PHOTO_MAX_BYTES) return setError(t("errors.size"));
    // Camera captures can arrive without a usable name; check the type then.
    const typeOk = isAllowedProfilePhotoName(file.name) || ["image/jpeg", "image/png", "image/webp"].includes(file.type);
    if (!typeOk) return setError(t("errors.type"));
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      setCrop({ bitmap, zoom: 1, x: 0, y: 0 });
    } catch {
      setError(t("errors.type"));
    }
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY };
  }
  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drag.current || !crop) return;
    // The canvas is drawn at PROFILE_PHOTO_SIZE but displayed smaller.
    const ratio = PROFILE_PHOTO_SIZE / e.currentTarget.getBoundingClientRect().width;
    const dx = (e.clientX - drag.current.x) * ratio;
    const dy = (e.clientY - drag.current.y) * ratio;
    drag.current = { x: e.clientX, y: e.clientY };
    setCrop((c) => {
      if (!c) return c;
      const g = geometry({ ...c, x: c.x + dx, y: c.y + dy });
      return { ...c, x: g.x, y: g.y };
    });
  }

  async function save() {
    if (!canvas.current) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await new Promise<Blob | null>((resolve) => canvas.current!.toBlob(resolve, "image/jpeg", 0.88));
      if (!blob) throw new Error("encode");
      const res = await fetch("/api/portal/profile/photo", {
        method: "POST",
        headers: { "Content-Type": "image/jpeg" },
        body: blob,
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error === "too_large" ? t("errors.size") : data.error === "unsupported_type" ? t("errors.type") : t("errors.generic"));
        return;
      }
      crop?.bitmap.close();
      setCrop(null);
      setVersion((v) => v + 1);
      router.refresh();
    } catch {
      setError(t("errors.generic"));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/portal/profile/photo", { method: "DELETE" });
      if (!res.ok) throw new Error(String(res.status));
      setVersion((v) => v + 1);
      router.refresh();
    } catch {
      setError(t("errors.generic"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:p-5">
      {crop ? (
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-muted-foreground">{t("cropHelp")}</p>
          <canvas
            ref={canvas}
            width={PROFILE_PHOTO_SIZE}
            height={PROFILE_PHOTO_SIZE}
            aria-label={t("cropLabel")}
            className="size-64 cursor-grab touch-none rounded-2xl border border-border active:cursor-grabbing"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={() => (drag.current = null)}
            onPointerCancel={() => (drag.current = null)}
          />
          <label className="flex w-64 flex-col gap-1 text-sm text-foreground">
            {t("zoom")}
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={crop.zoom}
              onChange={(e) => setCrop((c) => (c ? { ...c, zoom: Number(e.target.value) } : c))}
            />
          </label>
          <div className="grid w-full grid-cols-2 gap-2">
            <Button type="button" variant="outline" size="lg" className="h-12" disabled={busy} onClick={() => { crop.bitmap.close(); setCrop(null); }}>
              {t("cancel")}
            </Button>
            <Button type="button" size="lg" className="h-12" disabled={busy} onClick={save}>
              {busy ? t("saving") : t("use")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          {hasPhoto ? (
            // Private photo streamed by our own API route (no next/image).
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={version}
              src={`/api/portal/profile/photo?v=${version}`}
              alt={t("alt")}
              className="size-20 shrink-0 rounded-full border border-border object-cover"
            />
          ) : (
            <span className="flex size-20 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground">
              <UserRound className="size-10" aria-hidden />
            </span>
          )}
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" disabled={busy} onClick={() => fileInput.current?.click()}>
                <ImageUp className="size-4" aria-hidden />
                {hasPhoto ? t("change") : t("choose")}
              </Button>
              <Button type="button" variant="outline" disabled={busy} onClick={() => cameraInput.current?.click()}>
                <Camera className="size-4" aria-hidden />
                {t("take")}
              </Button>
              {hasPhoto && (
                <Button type="button" variant="ghost" disabled={busy} onClick={remove}>
                  <Trash2 className="size-4" aria-hidden />
                  {t("remove")}
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{t("rules")}</p>
          </div>
        </div>
      )}
      <input ref={fileInput} type="file" accept={PROFILE_PHOTO_ACCEPT} className="hidden" onChange={(e) => pick(e.target.files)} />
      <input ref={cameraInput} type="file" accept="image/jpeg,image/png,image/webp" capture="user" className="hidden" onChange={(e) => pick(e.target.files)} />
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
