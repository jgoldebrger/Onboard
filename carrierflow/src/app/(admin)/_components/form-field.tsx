import type { ReactNode } from "react";

export function FormField({
  label,
  name,
  children,
  hint,
}: {
  label: string;
  name: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-neutral-700">{label}</span>
      {children}
      {hint ? (
        <span className="text-xs text-neutral-500">{hint}</span>
      ) : null}
      <span className="sr-only">{name}</span>
    </label>
  );
}

export const inputClass =
  "w-full rounded border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none";

export const btnPrimary =
  "rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50";

export const btnSecondary =
  "rounded border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-50";
