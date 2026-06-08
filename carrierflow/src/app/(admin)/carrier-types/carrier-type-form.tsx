"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { btnPrimary, btnSecondary, FormField, inputClass } from "../_components/form-field";

type PartnerType = { id: string; name: string };

type Initial = {
  id?: string;
  partnerTypeId: string;
  slug: string;
  name: string;
  description: string;
  isActive: boolean;
};

export function CarrierTypeForm({
  partnerTypes,
  initial,
}: {
  partnerTypes: PartnerType[];
  initial?: Initial;
}) {
  const router = useRouter();
  const isEdit = Boolean(initial?.id);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const payload = {
      partnerTypeId: String(form.get("partnerTypeId")),
      slug: String(form.get("slug")),
      name: String(form.get("name")),
      description: String(form.get("description") || "") || undefined,
      isActive: form.get("isActive") === "on",
    };

    const url = isEdit
      ? `/api/admin/carrier-types/${initial!.id}`
      : "/api/admin/carrier-types";
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

    router.push("/carrier-types");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="max-w-lg space-y-4">
      <FormField label="Partner type" name="partnerTypeId">
        <select
          name="partnerTypeId"
          required
          defaultValue={initial?.partnerTypeId ?? partnerTypes[0]?.id}
          className={inputClass}
          disabled={isEdit}
        >
          {partnerTypes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </FormField>
      <FormField label="Slug" name="slug">
        <input
          name="slug"
          required
          defaultValue={initial?.slug}
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
        <a href="/carrier-types" className={btnSecondary}>
          Cancel
        </a>
      </div>
    </form>
  );
}
