"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ThreadMessage = {
  id: string;
  body: string;
  authorRole: "ADMIN" | "CARRIER";
  authorEmail: string;
  createdAt: string;
};

export function RequestInfoThread({
  applicationId,
  initialStatus,
  onStatusChange,
}: {
  applicationId: string;
  initialStatus: string;
  onStatusChange?: (status: string) => void;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMessages = useCallback(async () => {
    const res = await fetch(`/api/applications/${applicationId}/messages`);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error ?? "Failed to load messages");
    }
    const json = await res.json();
    setMessages(json.messages ?? []);
    if (json.status) {
      setStatus(json.status);
      onStatusChange?.(json.status);
    }
  }, [applicationId, onStatusChange]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadMessages();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadMessages]);

  if (status !== "NEEDS_INFO" && messages.length === 0 && !loading) {
    return null;
  }

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/applications/${applicationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: reply.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Send failed");
      setReply("");
      if (json.message) {
        setMessages((prev) => [...prev, json.message]);
      }
      if (json.status) {
        setStatus(json.status);
        onStatusChange?.(json.status);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/80 p-4">
      <div>
        <h2 className="text-sm font-semibold text-amber-950">
          Request for more information
        </h2>
        <p className="text-xs text-amber-900/80">
          Our team needs additional details. Reply here — your message is visible
          to reviewers on this application.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading thread…</p>
      ) : messages.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No messages yet. Check your email for details from the reviewer.
        </p>
      ) : (
        <ul className="max-h-48 space-y-2 overflow-y-auto rounded-md border border-amber-100 bg-white p-3 text-sm">
          {messages.map((m) => (
            <li key={m.id} className="space-y-0.5">
              <div className="flex flex-wrap items-baseline gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {m.authorRole === "ADMIN" ? "Reviewer" : "You"}
                </span>
                <span>{new Date(m.createdAt).toLocaleString()}</span>
              </div>
              <p className="whitespace-pre-wrap">{m.body}</p>
            </li>
          ))}
        </ul>
      )}

      {status === "NEEDS_INFO" ? (
        <form onSubmit={sendReply} className="flex gap-2">
          <Input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Your reply…"
            disabled={sending}
            className="flex-1 bg-white"
          />
          <Button type="submit" disabled={sending || !reply.trim()}>
            {sending ? "Sending…" : "Reply"}
          </Button>
        </form>
      ) : status === "IN_PROGRESS" && messages.length > 0 ? (
        <Alert>
          <AlertTitle>Reply received</AlertTitle>
          <AlertDescription>
            Your response was submitted. Continue onboarding and resubmit when
            ready.
          </AlertDescription>
        </Alert>
      ) : null}

      {error ? (
        <p className="text-sm text-red-700">{error}</p>
      ) : null}
    </section>
  );
}
