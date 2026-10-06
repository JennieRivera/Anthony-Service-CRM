"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { FilePickerButton } from "@/components/documents/FilePickerButton";
import { DuplicateMatchList } from "@/components/clients/DuplicateMatchList";
import { findPossibleDuplicateClientsAction } from "@/app/[locale]/(app)/clients/actions";
import type { ClientDuplicateMatch } from "@/lib/queries/clients";
import type { Client } from "@/lib/db/schema";

export function ClientForm({
  client,
  companies,
  onSubmit,
  onCreateWithDocument,
  academyContext = false,
}: {
  client?: Client;
  companies: { id: string; legalBusinessName: string }[];
  onSubmit: (values: ClientFormValues) => Promise<void>;
  // Only passed by the New Client page. A document can't be attached
  // before the client row exists, so this creates the client and returns
  // its id (no redirect) — the form then uploads the staged file itself
  // and navigates when both steps succeed.
  onCreateWithDocument?: (values: ClientFormValues) => Promise<string>;
  // Phase 2A — Academy New Student flow. Server Components can't pass a
  // plain function prop across to a Client Component (RSC boundary —
  // this used to be a postCreateRedirect(id) callback prop here, which
  // threw at runtime the first time this path actually ran end-to-end),
  // so the redirect target is computed inline below from this boolean
  // instead. Also shows a short banner explaining that saving continues
  // straight into Academy enrollment rather than the plain client profile.
  academyContext?: boolean;
}) {
  const t = useTranslations("Clients.form");
  const tStatus = useTranslations("ClientStatus");
  const tService = useTranslations("ServiceType");
  const tDocuments = useTranslations("Documents");
  const tCategory = useTranslations("DocumentCategory");
  const tDup = useTranslations("DuplicateMatch");
  const router = useRouter();
  const locale = useLocale();
  const [submitting, setSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState("other");
  const [uploadErrorKeyState, setUploadErrorKeyState] = useState<string | null>(null);
  // Set once the client has been created so a retry-after-upload-failure
  // doesn't create a second client.
  const [createdClientId, setCreatedClientId] = useState<string | null>(null);

  // Phase 2A — Master Person Identity Safety Net. Soft duplicate check run
  // once, right before a *new* client is actually inserted. Never runs in
  // edit mode (an existing client being edited can't be "a duplicate of
  // itself"). pendingValues holds the just-validated form values while
  // staff decides what to do; "Create New Person Anyway" calls
  // performCreate directly with them, bypassing submit()'s check entirely
  // rather than re-running it — plain state (not a ref) so this never
  // trips the "refs are render-only" compiler rule.
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [duplicateMatches, setDuplicateMatches] = useState<ClientDuplicateMatch[] | null>(
    null,
  );
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [confirmCreateAnyway, setConfirmCreateAnyway] = useState(false);
  const [pendingValues, setPendingValues] = useState<ClientFormValues | null>(null);

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
      address: client?.address ?? "",
      bestTimeToCall: client?.bestTimeToCall ?? "",
    },
  });

  async function submit(values: ClientFormValues) {
    if (!client) {
      setCheckingDuplicates(true);
      const matches = await findPossibleDuplicateClientsAction({
        fullName: values.fullName,
        email: values.email,
        phone: values.phone,
      });
      setCheckingDuplicates(false);

      if (matches.length > 0) {
        setPendingValues(values);
        setDuplicateMatches(matches);
        setConfirmCreateAnyway(false);
        setDuplicateDialogOpen(true);
        return;
      }
    }
    await performCreate(values);
  }

  async function performCreate(values: ClientFormValues) {
    setSubmitting(true);
    setUploadErrorKeyState(null);
    try {
      if (!client && onCreateWithDocument) {
        const id = createdClientId ?? (await onCreateWithDocument(values));
        setCreatedClientId(id);

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
        router.push(
          academyContext ? `/cases/new?serviceType=academy&clientId=${id}` : `/clients/${id}`,
        );
      } else {
        await onSubmit(values);
      }
    } finally {
      setSubmitting(false);
    }
  }

  function selectExistingPerson(matchId: string) {
    setDuplicateDialogOpen(false);
    router.push(`/clients/${matchId}`);
  }

  function reviewExistingPerson(matchId: string) {
    window.open(`/${locale}/clients/${matchId}`, "_blank", "noopener,noreferrer");
  }

  async function createAnyway() {
    if (!pendingValues) return;
    setDuplicateDialogOpen(false);
    setDuplicateMatches(null);
    setConfirmCreateAnyway(false);
    await performCreate(pendingValues);
    setPendingValues(null);
  }

  return (
    <>
    <form
      onSubmit={handleSubmit(submit)}
      className="flex flex-col gap-6 rounded-lg border border-border bg-card p-6"
    >
      {academyContext && (
        <p className="rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          {t("academyIntentBanner")}
        </p>
      )}

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
          <Label htmlFor="address">{t("address")}</Label>
          <Input id="address" maxLength={300} {...register("address")} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>{t("bestTimeToCall")}</Label>
          <Controller
            control={control}
            name="bestTimeToCall"
            render={({ field }) => (
              <Select
                value={field.value || "none"}
                onValueChange={(v) => field.onChange(v === "none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("bestTimeNotSet")}</SelectItem>
                  {(["morning", "midday", "afternoon", "evening"] as const).map((v) => (
                    <SelectItem key={v} value={v}>
                      {t(`bestTimes.${v}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
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
            <FilePickerButton
              accept={DOCUMENT_ACCEPT}
              file={file}
              onFileChange={(next) => {
                setFile(next);
                setUploadErrorKeyState(null);
              }}
              disabled={submitting}
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
          disabled={submitting || checkingDuplicates}
        >
          {t("cancel")}
        </Button>
        <Button type="submit" disabled={submitting || checkingDuplicates}>
          {checkingDuplicates
            ? tDup("checking")
            : submitting
              ? t("saving")
              : t("save")}
        </Button>
      </div>
    </form>

    <Dialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{tDup("title")}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{tDup("description")}</p>

        {duplicateMatches && (
          <DuplicateMatchList
            matches={duplicateMatches}
            renderActions={(match) => (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => reviewExistingPerson(match.id)}
                >
                  {tDup("reviewExisting")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => selectExistingPerson(match.id)}
                >
                  {tDup("useExisting")}
                </Button>
              </>
            )}
          />
        )}

        <div className="flex flex-col gap-2 rounded-md border border-dashed border-border p-3">
          <label className="flex items-start gap-2 text-sm">
            <Checkbox
              checked={confirmCreateAnyway}
              onCheckedChange={(value) => setConfirmCreateAnyway(Boolean(value))}
            />
            {tDup("createAnywayConfirm")}
          </label>
          <Button
            type="button"
            variant="outline"
            disabled={!confirmCreateAnyway || submitting}
            onClick={createAnyway}
            className="w-fit"
          >
            {tDup("createAnywayButton")}
          </Button>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setDuplicateDialogOpen(false)}
          >
            {tDup("cancel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
