import { db } from "@/lib/db";
import { saveApplicationAnswer } from "@/lib/interview/save-answer";
import { verifyInviteToken } from "./token";

export async function redeemInviteForUser(userId: string, token: string) {
  const payload = verifyInviteToken(token);
  if (!payload) {
    return { ok: false as const, error: "Invalid or expired invitation" };
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || user.email.toLowerCase() !== payload.email.toLowerCase()) {
    return {
      ok: false as const,
      error: "Invitation email does not match your account",
    };
  }

  let application = await db.onboardingApplication.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  if (!application) {
    application = await db.onboardingApplication.create({
      data: {
        userId,
        status: "IN_PROGRESS",
        carrierTypeId: payload.carrierTypeId,
      },
    });
  } else if (payload.carrierTypeId && !application.carrierTypeId) {
    application = await db.onboardingApplication.update({
      where: { id: application.id },
      data: { carrierTypeId: payload.carrierTypeId, status: "IN_PROGRESS" },
    });
  }

  if (payload.dotNumber) {
    await saveApplicationAnswer(
      application.id,
      "dot_number",
      payload.dotNumber,
      "invite",
    );
  }
  if (payload.mcNumber) {
    await saveApplicationAnswer(
      application.id,
      "mc_number",
      payload.mcNumber,
      "invite",
    );
  }
  if (payload.companyName) {
    await saveApplicationAnswer(
      application.id,
      "company_legal_name",
      payload.companyName,
      "invite",
    );
  }

  return { ok: true as const, applicationId: application.id };
}
