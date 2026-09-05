"use client";

import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function InlineStatusSelect<T extends string>({
  value,
  values,
  labelFor,
  onChange,
}: {
  value: T;
  values: readonly T[];
  labelFor: (value: T) => string;
  onChange: (value: T) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Select
      value={value}
      onValueChange={(next) => {
        if (!next) return;
        startTransition(() => onChange(next as T));
      }}
    >
      <SelectTrigger className="h-8 w-40" disabled={isPending}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {values.map((v) => (
          <SelectItem key={v} value={v}>
            {labelFor(v)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
