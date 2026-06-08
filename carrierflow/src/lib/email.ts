type EmailPayload = {
  to: string;
  subject: string;
  html: string;
};

export async function sendTransactionalEmail(
  payload: EmailPayload,
): Promise<{ sent: boolean; provider?: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM ?? "CarrierFlow <onboarding@carrierflow.local>";

  if (!apiKey) {
    if (process.env.NODE_ENV === "development") {
      console.info("[email:dev]", payload.to, payload.subject);
    }
    return { sent: false, provider: "none" };
  }

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
  });

  if (error) {
    console.error("[email]", error);
    return { sent: false, provider: "resend" };
  }

  return { sent: true, provider: "resend" };
}

export function applicationStatusEmail(params: {
  to: string;
  companyLabel: string;
  status: string;
  notes?: string;
}) {
  const statusLabels: Record<string, string> = {
    APPROVED: "approved",
    REJECTED: "rejected",
    NEEDS_INFO: "needs additional information",
    PENDING_REVIEW: "received and is under review",
  };
  const label = statusLabels[params.status] ?? params.status.toLowerCase();

  return sendTransactionalEmail({
    to: params.to,
    subject: `CarrierFlow: Your application ${label}`,
    html: `
      <p>Hello,</p>
      <p>Your carrier onboarding application for <strong>${params.companyLabel}</strong> ${label}.</p>
      ${params.notes ? `<p><strong>Note from reviewer:</strong> ${params.notes}</p>` : ""}
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/onboarding">View your application</a></p>
      <p>— CarrierFlow / Fabuwood</p>
    `,
  });
}
