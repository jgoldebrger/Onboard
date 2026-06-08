"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ApplicationActions({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  async function act(action: "approve" | "reject" | "request-info") {
    setLoading(action);
    try {
      const res = await fetch(`/api/admin/applications/${applicationId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notes || undefined }),
      });
      if (!res.ok) throw new Error(await res.text());
      router.refresh();
    } finally {
      setLoading(null);
    }
  }

  return (
    <section className="flex flex-wrap items-end gap-3 rounded border border-neutral-200 bg-neutral-50 p-4">
      <label className="flex flex-col gap-1 text-sm">
        Notes
        <input
          className="rounded border px-2 py-1 min-w-[200px]"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional"
        />
      </label>
      <Button
        type="button"
        disabled={!!loading}
        onClick={() => act("approve")}
        className="bg-emerald-700 text-white hover:bg-emerald-800"
      >
        {loading === "approve" ? "…" : "Approve"}
      </Button>
      <Button
        type="button"
        disabled={!!loading}
        variant="destructive"
        onClick={() => act("reject")}
      >
        {loading === "reject" ? "…" : "Reject"}
      </Button>
      <Button
        type="button"
        disabled={!!loading}
        variant="outline"
        onClick={() => act("request-info")}
      >
        {loading === "request-info" ? "…" : "Request info"}
      </Button>
    </section>
  );
}
