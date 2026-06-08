"use client";

import { QuestionType } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  buildQuestionValidation,
  parseQuestionValidation,
  VALIDATOR_PRESET_OPTIONS,
  validationConfigToFormState,
} from "@/lib/questions/validation";
import { btnPrimary, btnSecondary, FormField, inputClass } from "../_components/form-field";

const QUESTION_TYPES = Object.values(QuestionType);

type Initial = {
  id?: string;
  key: string;
  label: string;
  type: QuestionType;
  optionsJson: string;
  validationJson: string;
  isActive: boolean;
};

export function QuestionForm({ initial }: { initial?: Initial }) {
  const router = useRouter();
  const isEdit = Boolean(initial?.id);
  const parsedValidation = useMemo(
    () =>
      initial?.validationJson
        ? parseQuestionValidation(JSON.parse(initial.validationJson))
        : {},
    [initial],
  );
  const formDefaults = validationConfigToFormState(parsedValidation);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [validatorPreset, setValidatorPreset] = useState(formDefaults.preset);
  const [customPattern, setCustomPattern] = useState(formDefaults.customPattern);
  const [customMessage, setCustomMessage] = useState(formDefaults.customMessage);
  const [minLength, setMinLength] = useState(formDefaults.minLength);
  const [maxLength, setMaxLength] = useState(formDefaults.maxLength);

  const presetHelp = VALIDATOR_PRESET_OPTIONS.find(
    (o) => o.value === validatorPreset,
  )?.description;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);

    let options: unknown;
    let validation: unknown;
    const optionsRaw = String(form.get("optionsJson") || "").trim();
    try {
      options = optionsRaw ? JSON.parse(optionsRaw) : undefined;
      validation = buildQuestionValidation({
        preset: validatorPreset,
        customPattern,
        customMessage,
        minLength,
        maxLength,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Options must be valid JSON and validator settings must be complete.",
      );
      setLoading(false);
      return;
    }

    const payload = {
      key: String(form.get("key")),
      label: String(form.get("label")),
      type: String(form.get("type")) as QuestionType,
      options,
      validation,
      isActive: form.get("isActive") === "on",
    };

    const url = isEdit
      ? `/api/admin/questions/${initial!.id}`
      : "/api/admin/questions";
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

    router.push("/questions");
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
          placeholder="dot_number"
        />
      </FormField>
      <FormField label="Label" name="label">
        <input
          name="label"
          required
          defaultValue={initial?.label}
          className={inputClass}
          placeholder="DOT number"
        />
      </FormField>
      <FormField label="Type" name="type">
        <select
          name="type"
          required
          defaultValue={initial?.type ?? QuestionType.TEXT}
          className={inputClass}
        >
          {QUESTION_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </FormField>

      <fieldset className="space-y-3 rounded-lg border border-border p-4">
        <legend className="px-1 text-sm font-semibold">Answer validator</legend>
        <p className="text-xs text-muted-foreground">
          Applied when carriers answer in onboarding (interview chat). Use DOT / MC
          presets for authority numbers.
        </p>
        <FormField label="Validator preset" name="validatorPreset">
          <select
            value={validatorPreset}
            onChange={(e) => setValidatorPreset(e.target.value)}
            className={inputClass}
          >
            {VALIDATOR_PRESET_OPTIONS.map((o) => (
              <option key={o.value || "none"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </FormField>
        {presetHelp ? (
          <p className="text-xs text-muted-foreground">{presetHelp}</p>
        ) : null}

        {validatorPreset === "custom" ? (
          <>
            <FormField label="Regex pattern" name="customPattern">
              <input
                value={customPattern}
                onChange={(e) => setCustomPattern(e.target.value)}
                className={`${inputClass} font-mono text-xs`}
                placeholder="^[A-Z0-9-]+$"
              />
            </FormField>
            <FormField label="Error message" name="customMessage">
              <input
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className={inputClass}
                placeholder="Invalid format."
              />
            </FormField>
          </>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label="Min length (optional)" name="minLength">
            <input
              type="number"
              min={0}
              value={minLength}
              onChange={(e) => setMinLength(e.target.value)}
              className={inputClass}
            />
          </FormField>
          <FormField label="Max length (optional)" name="maxLength">
            <input
              type="number"
              min={0}
              value={maxLength}
              onChange={(e) => setMaxLength(e.target.value)}
              className={inputClass}
            />
          </FormField>
        </div>
      </fieldset>

      <FormField
        label="Options (JSON)"
        name="optionsJson"
        hint='For DROPDOWN / MULTI_SELECT — e.g. ["Option A", "Option B"]'
      >
        <textarea
          name="optionsJson"
          rows={3}
          defaultValue={initial?.optionsJson ?? ""}
          className={`${inputClass} font-mono text-xs`}
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
        <a href="/questions" className={btnSecondary}>
          Cancel
        </a>
      </div>
    </form>
  );
}
