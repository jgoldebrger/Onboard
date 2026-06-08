"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { btnPrimary, btnSecondary, FormField, inputClass } from "../_components/form-field";

type Initial = {
  id?: string;
  key: string;
  name: string;
  description: string;
  mimeTypes: string;
  isActive: boolean;
};

export function DocumentTypeForm({ initial }: { initial?: Initial }) {
  const router = useRouter();
  const isEdit = Boolean(initial?.id);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const mimeTypes = String(form.get("mimeTypes"))
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (mimeTypes.length === 0) {
      setError("At least one MIME type is required");
      setLoading(false);
      return;
    }

    const payload = {
      key: String(form.get("key")),
      name: String(form.get("name")),
      description: String(form.get("description") || "") || undefined,
      mimeTypes,
      isActive: form.get("isActive") === "on",
    };

    const url = isEdit
      ? `/api/admin/document-types/${initial!.id}`
      : "/api/admin/document-types";
    const res = await fetch(url, {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Save failed");
      setLoading(false);
      return;
    }

    router.push("/documents");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="max-w-lg space-y-4">
      <FormField label="Key" name="key">
        <input
          name="key"
          required
          defaultValue={initial?.key}
          className={inputClass}
          disabled={isEdit}
        />
      </FormField>
      <FormField label="Name" name="name">
        <input
          name="name"
          required
          defaultValue={initial?.name}
          className={inputClass}
        />
      </FormField>
      <FormField label="Description" name="description">
        <textarea
          name="description"
          rows={3}
          defaultValue={initial?.description ?? ""}
          className={inputClass}
        />
      </FormField>
      <FormField
        label="MIME types"
        name="mimeTypes"
        hint="Comma-separated, e.g. application/pdf, image/png"
      >
        <input
          name="mimeTypes"
          required
          defaultValue={initial?.mimeTypes}
          className={inputClass}
        />
      </FormField>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={initial?.isActive ?? true}
        />
        Active
      </label>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="flex gap-2">
        <button type="submit" disabled={loading} className={btnPrimary}>
          {loading ? "Saving…" : "Save"}
        </button>
        <a href="/documents" className={btnSecondary}>
          Cancel
        </a>
      </div>
    </form>
  );
}
