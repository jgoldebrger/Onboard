"use client";

import { useState } from "react";
import { btnPrimary, FormField, inputClass } from "./form-field";

export function CarrierInviteForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const companyName = String(form.get("companyName") ?? "").trim();
    const dotNumber = String(form.get("dotNumber") ?? "").trim();
    const mcNumber = String(form.get("mcNumber") ?? "").trim();

    const payload: Record<string, string> = { email };
    if (companyName) payload.companyName = companyName;
    if (dotNumber) payload.dotNumber = dotNumber;
    if (mcNumber) payload.mcNumber = mcNumber;

    const res = await fetch("/api/admin/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Invite failed");
      return;
    }

    const emailNote = data.emailSent
      ? "Invitation email sent."
      : "Invite created (email not sent — check RESEND_API_KEY).";
    setSuccess(`${emailNote} Sign-up link: ${data.inviteUrl ?? "/sign-up"}`);
    e.currentTarget.reset();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3 rounded-md border border-neutral-200 bg-neutral-50 p-4"
    >
      <div>
        <h2 className="text-sm font-semibold">Invite carrier</h2>
        <p className="text-xs text-neutral-500">
          Send a sign-up link prefilled with DOT/MC when provided.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Email" name="email">
          <input
            name="email"
            type="email"
            required
            className={inputClass}
            placeholder="carrier@example.com"
          />
        </FormField>
        <FormField label="Company name (optional)" name="companyName">
          <input name="companyName" className={inputClass} />
        </FormField>
        <FormField label="DOT (optional)" name="dotNumber">
          <input name="dotNumber" className={inputClass} />
        </FormField>
        <FormField label="MC (optional)" name="mcNumber">
          <input name="mcNumber" className={inputClass} />
        </FormField>
      </div>
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="text-sm text-green-700" role="status">
          {success}
        </p>
      ) : null}
      <button type="submit" disabled={loading} className={btnPrimary}>
        {loading ? "Sending…" : "Send invitation"}
      </button>
    </form>
  );
}
