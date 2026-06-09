import { createHmac } from "node:crypto";

export type WebhookEvent =
  | "application.submitted"
  | "application.approved"
  | "application.rejected"
  | "application.request_info"
  | "application.reopened";

export type WebhookPayload = {
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, unknown>;
};

export function signWebhookBody(body: string, secret: string): string {
  const digest = createHmac("sha256", secret).update(body).digest("hex");
  return `sha256=${digest}`;
}

export async function emitWebhookEvent(
  event: WebhookEvent,
  data: Record<string, unknown>,
): Promise<{ sent: boolean; error?: string }> {
  const url = process.env.WEBHOOK_URL?.trim();
  if (!url) return { sent: false };

  const secret = process.env.WEBHOOK_SECRET ?? "";
  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };
  const body = JSON.stringify(payload);
  const signature = signWebhookBody(body, secret);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CarrierFlow-Signature": signature,
        "X-CarrierFlow-Event": event,
      },
      body,
    });
    if (!res.ok) {
      return { sent: false, error: `HTTP ${res.status}` };
    }
    return { sent: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook failed";
    console.error("Webhook delivery failed", event, message);
    return { sent: false, error: message };
  }
}
