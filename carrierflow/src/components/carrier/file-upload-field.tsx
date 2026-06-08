"use client";

import { useId, useState } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function FileUploadField({
  name,
  label,
  description,
  accept,
  required,
}: {
  name: string;
  label: string;
  description?: string;
  accept?: string;
  required?: boolean;
}) {
  const id = useId();
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {description ? (
        <p className="text-xs text-muted-foreground">{description}</p>
      ) : null}
      <label
        htmlFor={id}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/40 px-4 py-8 text-center transition-colors",
          "hover:border-primary/50 hover:bg-accent/30",
          fileName && "border-primary/40 bg-accent/20",
        )}
      >
        <span className="text-2xl" aria-hidden>
          📄
        </span>
        <span className="mt-2 text-sm font-medium text-foreground">
          {fileName ? fileName : "Click to choose a file"}
        </span>
        <span className="mt-1 text-xs text-muted-foreground">
          PDF or image, max 10 MB
        </span>
        <input
          id={id}
          name={name}
          type="file"
          accept={accept}
          required={required}
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            setFileName(file?.name ?? null);
          }}
        />
      </label>
    </div>
  );
}
