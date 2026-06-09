"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type ProfileData = {
  email: string;
  companyName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
};

export function CarrierProfileForm({ initial }: { initial: ProfileData }) {
  const [companyName, setCompanyName] = useState(initial.companyName ?? "");
  const [contactPhone, setContactPhone] = useState(initial.contactPhone ?? "");
  const [contactEmail, setContactEmail] = useState(initial.contactEmail ?? "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/carrier/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: companyName || null,
          contactPhone: contactPhone || null,
          contactEmail: contactEmail || null,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Failed to save");
      }
      setMessage("Profile updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <label className="flex flex-col gap-1 text-sm">
        Login email
        <input
          className="rounded-md border border-input bg-muted px-3 py-2 text-muted-foreground"
          value={initial.email}
          disabled
          readOnly
        />
        <span className="text-xs text-muted-foreground">
          Sign-in email cannot be changed here. Update dispatch contact below.
        </span>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Company / DBA name
        <input
          className="rounded-md border border-input bg-card px-3 py-2"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="Display name for ops"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Dispatch contact email
        <input
          type="email"
          className="rounded-md border border-input bg-card px-3 py-2"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          placeholder="dispatch@carrier.com"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Contact phone
        <input
          type="tel"
          className="rounded-md border border-input bg-card px-3 py-2"
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value)}
          placeholder="(555) 555-0100"
        />
      </label>

      <p className="text-xs text-muted-foreground">
        DOT number and FMCSA legal name cannot be changed after approval. Contact
        Fabuwood ops if those need updating.
      </p>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

      <Button type="submit" disabled={loading}>
        {loading ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}
