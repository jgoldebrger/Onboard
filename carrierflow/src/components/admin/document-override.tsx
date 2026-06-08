"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DocumentOverride({
  applicationId,
  reviewId,
  fileName,
}: {
  applicationId: string;
  reviewId: string;
  fileName: string;
}) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  async function override() {
    if (!reason.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/applications/${applicationId}/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType: "document_review",
          entityId: reviewId,
          reason,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
      <input
        className="rounded border px-2 py-1 min-w-[180px]"
        placeholder={`Override ${fileName}…`}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <button
        type="button"
        disabled={loading || !reason.trim()}
        onClick={override}
        className="rounded border border-amber-600 px-2 py-1 text-amber-900 disabled:opacity-50"
      >
        Override to passed
      </button>
    </div>
  );
}
