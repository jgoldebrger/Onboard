"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { btnPrimary, btnSecondary, FormField, inputClass } from "../_components/form-field";

type Initial = {
  id?: string;
  key: string;
  label: string;
  points: number;
  conditionJson: string;
  isEnabled: boolean;
};

export function RiskRuleForm({ initial }: { initial?: Initial }) {
  const router = useRouter();
  const isEdit = Boolean(initial?.id);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);

    let condition: unknown;
    const conditionRaw = String(form.get("conditionJson") || "").trim();
    try {
      condition = conditionRaw ? JSON.parse(conditionRaw) : {};
    } catch {
      setError("Condition must be valid JSON");
      setLoading(false);
      return;
    }

    const payload = {
      key: String(form.get("key")),
      label: String(form.get("label")),
      points: parseInt(String(form.get("points")), 10),
      condition,
      isEnabled: form.get("isEnabled") === "on",
    };

    const url = isEdit
      ? `/api/admin/risk-rules/${initial!.id}`
      : "/api/admin/risk-rules";
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

    router.push("/risk-rules");
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
      <FormField label="Label" name="label">
        <input
          name="label"
          required
          defaultValue={initial?.label}
          className={inputClass}
        />
      </FormField>
      <FormField label="Points" name="points">
        <input
          name="points"
          type="number"
          required
          defaultValue={initial?.points ?? 0}
          className={inputClass}
        />
      </FormField>
      <FormField
        label="Condition (JSON)"
        name="conditionJson"
        hint='Rule condition object, e.g. {"field":"dot_status","operator":"eq","value":"INACTIVE"}'
      >
        <textarea
          name="conditionJson"
          rows={6}
          required
          defaultValue={
            initial?.conditionJson ??
            '{\n  "field": "example",\n  "operator": "eq",\n  "value": true\n}'
          }
          className={`${inputClass} font-mono text-xs`}
        />
      </FormField>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isEnabled"
          defaultChecked={initial?.isEnabled ?? true}
        />
        Enabled
      </label>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="flex gap-2">
        <button type="submit" disabled={loading} className={btnPrimary}>
          {loading ? "Saving…" : "Save"}
        </button>
        <a href="/risk-rules" className={btnSecondary}>
          Cancel
        </a>
      </div>
    </form>
  );
}
