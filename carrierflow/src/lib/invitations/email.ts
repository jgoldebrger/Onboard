import { sendTransactionalEmail } from "@/lib/email";
import { buildInviteUrl } from "./token";

export async function sendCarrierInviteEmail(params: {
  to: string;
  token: string;
  dotNumber?: string;
  mcNumber?: string;
  carrierTypeName?: string;
  invitedBy?: string;
}) {
  const inviteUrl = buildInviteUrl(params.token);
  return sendTransactionalEmail({
    to: params.to,
    subject: "You're invited to onboard with Fabuwood / CarrierFlow",
    html: `
      <p>Hello,</p>
      <p>You've been invited to complete carrier onboarding for Fabuwood.</p>
      ${params.carrierTypeName ? `<p>Carrier type: <strong>${params.carrierTypeName}</strong></p>` : ""}
      ${params.dotNumber ? `<p>DOT on file: <strong>${params.dotNumber}</strong></p>` : ""}
      ${params.mcNumber ? `<p>MC on file: <strong>${params.mcNumber}</strong></p>` : ""}
      <p><a href="${inviteUrl}">Accept invitation and create your account</a></p>
      <p>This link expires in 14 days. If you already have an account, sign in and open the link while logged in.</p>
      ${params.invitedBy ? `<p>Invited by ${params.invitedBy}</p>` : ""}
      <p>— CarrierFlow / Fabuwood</p>
    `,
  });
}
