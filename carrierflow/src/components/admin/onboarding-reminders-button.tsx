"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function OnboardingRemindersButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function sendReminders() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/applications/reminders", {
        method: "POST",
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { sent: number; total: number };
      setMessage(
        data.total === 0
          ? "No idle applications need reminders."
          : `Sent ${data.sent} of ${data.total} reminder email(s).`,
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to send reminders");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={loading}
        onClick={sendReminders}
      >
        {loading ? "Sending…" : "Send idle onboarding reminders"}
      </Button>
      {message ? (
        <span className="text-xs text-muted-foreground">{message}</span>
      ) : null}
    </div>
  );
}
