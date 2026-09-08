"use client";

import { useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Upload, Download, Video, Image as ImageIcon } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { serviceTypeValues } from "@/lib/validation/client";
import {
  marketingChannelValues,
  MARKETING_CONTENT_ACCEPT,
} from "@/lib/validation/marketingContent";
import { assetViewHref, assetDownloadHref } from "./assetHref";
import { marketingUploadErrorKey } from "./uploadErrorKey";
import type { listMarketingContentAssets } from "@/lib/queries/marketingContent";

type Asset = Awaited<ReturnType<typeof listMarketingContentAssets>>[number];

function isVideoFile(fileName: string): boolean {
  return /\.(mp4|mov|webm)$/i.test(fileName);
}

export function MarketingContentLibrary({
  assets,
  blobConfigured,
}: {
  assets: Asset[];
  blobConfigured: boolean;
}) {
  const t = useTranslations("MarketingContent");
  const tService = useTranslations("ServiceType");
  const [serviceFilter, setServiceFilter] = useState("all");

  const filtered = useMemo(() => {
    if (serviceFilter === "all") return assets;
    if (serviceFilter === "general") return assets.filter((a) => !a.serviceType);
    return assets.filter((a) => a.serviceType === serviceFilter);
  }, [assets, serviceFilter]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select value={serviceFilter} onValueChange={(v) => setServiceFilter(v ?? "all")}>
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allServices")}</SelectItem>
            <SelectItem value="general">{t("generalService")}</SelectItem>
            {serviceTypeValues.map((s) => (
              <SelectItem key={s} value={s}>
                {tService(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {blobConfigured && <UploadDialog />}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
          {assets.length === 0 ? t("empty") : t("noResultsForFilter")}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((asset) => (
            <AssetCard key={asset.id} asset={asset} />
          ))}
        </div>
      )}
    </div>
  );
}

function AssetCard({ asset }: { asset: Asset }) {
  const t = useTranslations("MarketingContent");
  const tService = useTranslations("ServiceType");
  const tChannel = useTranslations("MarketingChannel");
  const video = isVideoFile(asset.fileName);

  return (
    <div className="flex flex-col gap-2 overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex aspect-video items-center justify-center bg-muted">
        {video ? (
          <video src={assetViewHref(asset.id)} controls className="h-full w-full object-cover" />
        ) : (
          // next/image's optimizer fetches the source server-side without
          // the viewer's session cookie, which this authenticated route
          // requires — a plain <img> (same-origin, cookie sent normally) is
          // the correct choice here, not an oversight.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={assetViewHref(asset.id)}
            alt={asset.caption ?? asset.fileName}
            className="h-full w-full object-cover"
          />
        )}
      </div>
      <div className="flex flex-col gap-1.5 px-3 pb-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {video ? <Video className="h-3.5 w-3.5" /> : <ImageIcon className="h-3.5 w-3.5" />}
          <span className="truncate">{asset.fileName}</span>
        </div>
        {asset.caption && (
          <p className="line-clamp-2 text-sm text-foreground">{asset.caption}</p>
        )}
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span className="rounded-full bg-accent/15 px-2 py-0.5">
            {asset.serviceType ? tService(asset.serviceType) : t("generalService")}
          </span>
          {asset.channel && (
            <span className="rounded-full bg-accent/15 px-2 py-0.5">
              {tChannel(asset.channel)}
            </span>
          )}
          {asset.publishedDate && (
            <span>{new Date(asset.publishedDate).toLocaleDateString()}</span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          render={<a href={assetDownloadHref(asset.id)} />}
        >
          <Download className="h-4 w-4" />
          {t("download")}
        </Button>
      </div>
    </div>
  );
}

function UploadDialog() {
  const t = useTranslations("MarketingContent");
  const tService = useTranslations("ServiceType");
  const tChannel = useTranslations("MarketingChannel");
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [service, setService] = useState("general");
  const [publishedDate, setPublishedDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [channel, setChannel] = useState("");
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  function reset() {
    setService("general");
    setPublishedDate(new Date().toISOString().slice(0, 10));
    setChannel("");
    setCaption("");
    setErrorKey(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleUpload() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    setErrorKey(null);

    const formData = new FormData();
    formData.append("file", file);
    if (service !== "general") formData.append("serviceType", service);
    if (publishedDate) formData.append("publishedDate", publishedDate);
    if (channel) formData.append("channel", channel);
    if (caption) formData.append("caption", caption);

    try {
      const res = await fetch("/api/marketing-content/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setErrorKey(marketingUploadErrorKey(body));
        return;
      }
      reset();
      setOpen(false);
      router.refresh();
      toast.success(t("uploadSuccess"));
    } catch {
      setErrorKey("uploadError");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={<Button size="sm" />}>
        <Upload className="h-4 w-4" />
        {t("upload")}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("uploadDialogTitle")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>{t("file")}</Label>
            <Input ref={fileInputRef} type="file" accept={MARKETING_CONTENT_ACCEPT} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>{t("service")}</Label>
            <Select value={service} onValueChange={(v) => setService(v ?? "general")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">{t("generalService")}</SelectItem>
                {serviceTypeValues.map((s) => (
                  <SelectItem key={s} value={s}>
                    {tService(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="publishedDate">{t("publishedDate")}</Label>
            <Input
              id="publishedDate"
              type="date"
              value={publishedDate}
              onChange={(e) => setPublishedDate(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>{t("channel")}</Label>
            <Select value={channel || "none"} onValueChange={(v) => setChannel(!v || v === "none" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder={t("selectChannel")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("selectChannel")}</SelectItem>
                {marketingChannelValues.map((c) => (
                  <SelectItem key={c} value={c}>
                    {tChannel(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="caption">{t("caption")}</Label>
            <Input
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder={t("captionPlaceholder")}
            />
          </div>

          {errorKey && <p className="text-sm text-destructive">{t(errorKey)}</p>}
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleUpload} disabled={uploading}>
            {uploading ? t("uploading") : t("upload")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
