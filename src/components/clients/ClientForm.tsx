"use client";

import { useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  clientFormSchema,
  clientStatusValues,
  serviceTypeValues,
  type ClientFormValues,
} from "@/lib/validation/client";
import { selectableDocumentCategoryValues } from "@/lib/validation/documentCategory";
import { DOCUMENT_ACCEPT, uploadErrorKey } from "@/components/documents/documentUploadShared";
import type { Client } from "@/lib/db/schema";

export function ClientForm({
  client,
  companies,
  onSubmit,
  onCreateWithDocument,
}: {
  client?: Client;
  companies: { id: string; legalBusinessName: string }[];
  onSubmit: (values: ClientFormValues) => Promise<void>;
  // Only passed by the New Client page. A document can't be attached
  // before the client row exists, so this creates the client and returns
  // its id (no redirect) — the form then uploads the staged file itself
  // and navigates when both steps succeed.
  onCreateWithDocument?: (values: ClientFormValues) => Promise<string>;
}) {
  const t = useTranslations("Clients.form");
  const tStatus = useTranslations("ClientStatus");
  const tService = useTranslations("ServiceType");
  const tDocuments = useTranslations("Documents");
  const tCategory = useTranslations("DocumentCategory");
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState("other");
  const [uploadErrorKeyState, setUploadErrorKeyState] = useState<string | null>(null);
  // Set once the client has been created so a retry-after-upload-failure
  // doesn't create a second client.
  const [createdClientId, setCreatedClientId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      fullName: client?.fullName ?? "",
      email: client?.email ?? "",
      phone: client?.phone ?? "",
      preferredLanguage: client?.preferredLanguage ?? "en",
      status: client?.status ?? "lead",
      referralSource: client?.referralSource ?? "",
      interestedServices: client?.interestedServices ?? [],
      notes: client?.notes ?? "",
      companyId: client?.companyId ?? "",
      folderNumber: client?.folderNumber ?? "",
    },
  });

  async function submit(values: ClientFormValues) {
    setSubmitting(true);
    setUploadErrorKeyState(null);
    try {
      if (!client && onCreateWithDocument) {
        const id = createdClientId ?? (await onCreateWithDocument(values));
        setCreatedClientId(id);

        const file = fileInputRef.current?.files?.[0];
        if (file) {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("clientId", id);
          formData.append("category", category);
          const res = await fetch("/api/documents/upload", {
            method: "POST",
            body: formData,
          });
          if (!res.ok) {
            const body = await res.json().catch(() => null);
            setUploadErrorKeyState(uploadErrorKey(body));
            return;
          }
        }
        router.push(`/clients/${id}`);
      } else {
        await onSubmit(values);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit(submit)}
      className="flex flex-col gap-6 rounded-lg border border-border bg-card p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fullName">{t("fullName")}</Label>
          <Input id="fullName" {...register("fullName")} />
          {errors.fullName && (
            <p className="text-sm text-destructive">
              {errors.fullName.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">{t("email")}</Label>
          <Input id="email" type="email" {...register("email")} />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">{t("phone")}</Label>
          <Input id="phone" {...register("phone")} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>{t("preferredLanguage")}</Label>
          <Controller
            control={control}
            name="preferredLanguage"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>{t("status")}</Label>
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {clientStatusValues.map((status) => (
                    <SelectItem key={status} value={status}>
                      {tStatus(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="referralSource">{t("referralSource")}</Label>
          <Input id="referralSource" {...register("referralSource")} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="folderNumber">{t("folderNumber")}</Label>
          <Input
            id="folderNumber"
            placeholder={t("folderNumberPlaceholder")}
            {...register("folderNumber")}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>{t("company")}</Label>
          <Controller
            control={control}
            name="companyId"
            render={({ field }) => (
              <Select
                value={field.value || "none"}
                onValueChange={(v) => field.onChange(v === "none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("noCompany")}</SelectItem>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.legalBusinessName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label>{t("interestedServices")}</Label>
        <Controller
          control={control}
          name="interestedServices"
          render={({ field }) => (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {serviceTypeValues.map((service) => {
                const checked = field.value.includes(service);
                return (
                  <label
                    key={service}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(value) => {
                        if (value) {
                          field.onChange([...field.value, service]);
                        } else {
                          field.onChange(
                            field.value.filter((s) => s !== service),
                          );
                        }
                      }}
                    />
                    {tService(service)}
                  </label>
                );
              })}
            </div>
          )}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">{t("notes")}</Label>
        <Textarea id="notes" rows={4} {...register("notes")} />
      </div>

      {!client && onCreateWithDocument && (
        <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-4">
          <Label>{t("attachDocument")}</Label>
          <p className="text-sm text-muted-foreground">{t("attachDocumentHint")}</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              ref={fileInputRef}
              type="file"
              accept={DOCUMENT_ACCEPT}
              className="sm:max-w-xs"
            />
            <Select value={category} onValueChange={(v) => setCategory(v ?? "other")}>
              <SelectTrigger className="sm:max-w-xs">
                <SelectValue placeholder={tDocuments("selectCategory")} />
              </SelectTrigger>
              <SelectContent>
                {selectableDocumentCategoryValues.map((value) => (
                  <SelectItem key={value} value={value}>
                    {tCategory(value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {uploadErrorKeyState && (
            <p className="text-sm text-destructive">{tDocuments(uploadErrorKeyState)}</p>
          )}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={submitting}
        >
          {t("cancel")}
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? t("saving") : t("save")}
        </Button>
      </div>
    </form>
  );
}
