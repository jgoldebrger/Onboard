"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export type AdminNoteRow = {
  id: string;
  body: string;
  createdAt: string;
  authorEmail: string;
};

export function AdminNotesPanel({
  applicationId,
  initialNotes,
}: {
  applicationId: string;
  initialNotes: AdminNoteRow[];
}) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitNote() {
    const text = body.trim();
    if (!text) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/applications/${applicationId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      const note = (await res.json()) as AdminNoteRow;
      setNotes((prev) => [note, ...prev]);
      setBody("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save note");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-3 rounded-lg border border-border p-4">
      <div>
        <h2 className="text-sm font-semibold">Internal notes</h2>
        <p className="text-xs text-muted-foreground">
          Visible to admins only — not shared with the carrier.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Add note
          <textarea
            className="min-h-[72px] rounded-md border border-input bg-card px-3 py-2 text-sm"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Ops context, call notes, follow-ups…"
          />
        </label>
        <Button
          type="button"
          disabled={loading || !body.trim()}
          onClick={submitNote}
        >
          {loading ? "Saving…" : "Save note"}
        </Button>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No internal notes yet.</p>
      ) : (
        <ul className="divide-y rounded-md border text-sm">
          {notes.map((note) => (
            <li key={note.id} className="space-y-1 px-3 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>{note.authorEmail}</span>
                <time dateTime={note.createdAt}>
                  {new Date(note.createdAt).toLocaleString()}
                </time>
              </div>
              <p className="whitespace-pre-wrap">{note.body}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
