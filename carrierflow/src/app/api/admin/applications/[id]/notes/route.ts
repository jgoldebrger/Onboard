import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { auditLog } from "@/lib/audit";
import { db } from "@/lib/db";
import { clientIp, handleApiError } from "../../../_utils";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    await requirePermission("applications:read");
    const { id } = await params;

    const notes = await db.applicationAdminNote.findMany({
      where: { applicationId: id },
      include: { author: { select: { email: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      notes.map((note) => ({
        id: note.id,
        body: note.body,
        createdAt: note.createdAt.toISOString(),
        authorEmail: note.author.email,
      })),
    );
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request, { params }: Params) {
  try {
    const user = await requirePermission("applications:read");
    const { id } = await params;
    const body = (await req.json()) as { body?: string };
    const text = body.body?.trim();

    if (!text) {
      return NextResponse.json({ error: "Note body is required" }, { status: 400 });
    }

    const application = await db.onboardingApplication.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!application) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const note = await db.applicationAdminNote.create({
      data: {
        applicationId: id,
        authorId: user.id,
        body: text,
      },
      include: { author: { select: { email: true } } },
    });

    await auditLog({
      actorId: user.id,
      entityType: "OnboardingApplication",
      entityId: id,
      action: "ADMIN_NOTE",
      after: { noteId: note.id },
      ipAddress: clientIp(req),
    });

    return NextResponse.json({
      id: note.id,
      body: note.body,
      createdAt: note.createdAt.toISOString(),
      authorEmail: note.author.email,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
