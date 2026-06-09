import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { auditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { createInviteToken } from "@/lib/invitations/token";
import { sendCarrierInviteEmail } from "@/lib/invitations/email";
import { clientIp, handleApiError } from "../_utils";

const bodySchema = z.object({
  email: z.string().email(),
  dotNumber: z.string().optional(),
  mcNumber: z.string().optional(),
  carrierTypeId: z.string().optional(),
  companyName: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const user = await requirePermission("applications:approve");
    const body = bodySchema.parse(await req.json());

    let carrierTypeName: string | undefined;
    if (body.carrierTypeId) {
      const ct = await db.carrierType.findUnique({
        where: { id: body.carrierTypeId },
      });
      if (!ct) {
        return NextResponse.json(
          { error: "Carrier type not found" },
          { status: 404 },
        );
      }
      carrierTypeName = ct.name;
    }

    const token = createInviteToken({
      email: body.email,
      dotNumber: body.dotNumber,
      mcNumber: body.mcNumber,
      carrierTypeId: body.carrierTypeId,
      companyName: body.companyName,
    });

    const emailResult = await sendCarrierInviteEmail({
      to: body.email,
      token,
      dotNumber: body.dotNumber,
      mcNumber: body.mcNumber,
      carrierTypeName,
      invitedBy: user.email ?? undefined,
    });

    await auditLog({
      actorId: user.id,
      entityType: "CarrierInvitation",
      entityId: body.email,
      action: "SEND",
      after: {
        email: body.email,
        dotNumber: body.dotNumber,
        mcNumber: body.mcNumber,
        carrierTypeId: body.carrierTypeId,
        emailSent: emailResult.sent,
      },
      ipAddress: clientIp(req),
    });

    return NextResponse.json({
      ok: true,
      emailSent: emailResult.sent,
      inviteUrl: `/sign-up?invite=${encodeURIComponent(token)}`,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
