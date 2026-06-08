"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CarrierFmcsaRefresh({
  applicationId,
  needsFullSync,
}: {
  applicationId: string;
  needsFullSync: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/verification/${applicationId}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? `Refresh failed (${res.status})`);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refresh failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-muted/30 px-4 py-3">
      {needsFullSync ? (
        <p className="text-sm text-muted-foreground">
          This carrier was synced before the full SAFER pull. Refresh to load
          basics, cargo, inspections, CSA scores, and all registry fields.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Re-query FMCSA for the latest SAFER registry data.
        </p>
      )}
      <Button type="button" size="sm" onClick={refresh} disabled={busy}>
        {busy ? "Refreshing…" : "Refresh from FMCSA"}
      </Button>
      {error ? <p className="w-full text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
