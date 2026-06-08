"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { btnSecondary } from "./form-field";

export function DeleteButton({
  apiPath,
  redirectTo,
  label = "Delete",
}: {
  apiPath: string;
  redirectTo: string;
  label?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!confirm(`Delete this item? This cannot be undone.`)) return;
    setLoading(true);
    setError(null);
    const res = await fetch(apiPath, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(
        typeof data.error === "string" ? data.error : "Delete failed",
      );
      setLoading(false);
      return;
    }
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleDelete}
        disabled={loading}
        className={`${btnSecondary} text-red-700 border-red-200 hover:bg-red-50`}
      >
        {loading ? "Deleting…" : label}
      </button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
