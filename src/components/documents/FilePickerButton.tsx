"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";

// Styled replacement for the browser's native "Choose File / No file chosen"
// control, shared by every staff-side uploader so they all look and behave
// the same. Controlled: the parent owns the chosen File, and clearing it
// (setting `file` to null after a successful upload) also resets the input.
export function FilePickerButton({
  accept,
  file,
  onFileChange,
  disabled,
}: {
  accept: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
}) {
  const t = useTranslations("Documents");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file && inputRef.current) inputRef.current.value = "";
  }, [file]);

  return (
    <div className="flex min-w-0 items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        <Paperclip className="h-4 w-4" />
        {t("chooseFile")}
      </Button>
      <span
        className="max-w-[12rem] truncate text-sm text-muted-foreground"
        title={file?.name}
      >
        {file?.name ?? t("noFileChosen")}
      </span>
    </div>
  );
}
