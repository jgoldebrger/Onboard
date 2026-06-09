"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function FraudWaiverForm({
  applicationId,
  fraudScore,
  fraudLevel,
}: {
  applicationId: string;
  fraudScore: number;
  fraudLevel: string;
}) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function waive() {
    if (!reason.trim()) {
      setError("A reason is required");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/applications/${applicationId}/fraud-waiver`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: reason.trim() }),
        },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Waiver failed");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Waiver failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 space-y-3 rounded-md border border-amber-300 bg-amber-50 p-3">
      <p className="text-sm">
        Fraud score {fraudScore} ({fraudLevel}) blocks carrier submit. Waive with
        a documented reason to allow submission.
      </p>
      <label className="flex flex-col gap-1 text-sm">
        Waiver reason
        <textarea
          className="min-h-[72px] rounded border border-input bg-card px-2 py-1"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Why is this application allowed to proceed?"
        />
      </label>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button
        type="button"
        variant="outline"
        disabled={loading}
        onClick={() => void waive()}
      >
        {loading ? "Saving…" : "Waive fraud block"}
      </Button>
    </div>
  );
}
