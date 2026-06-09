import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser, hasPermission } from "@/lib/auth";
import {
  createApplicationMessage,
  listApplicationMessages,
} from "@/lib/applications/messages";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  body: z.string().min(1).max(5000),
});

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const application = await db.onboardingApplication.findUnique({
    where: { id },
    select: { id: true, userId: true, status: true },
  });
  if (!application) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isOwner = application.userId === user.id;
  const isAdmin = hasPermission(user.role, "applications:read");
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const messages = await listApplicationMessages(id);
  return NextResponse.json({
    status: application.status,
    messages: messages.map((m) => ({
      id: m.id,
      body: m.body,
      authorRole: m.authorRole,
      authorEmail: m.author.email,
      createdAt: m.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const application = await db.onboardingApplication.findUnique({
    where: { id },
    select: { id: true, userId: true, status: true },
  });
  if (!application) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isOwner = application.userId === user.id;
  const isAdmin = hasPermission(user.role, "applications:approve");
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (isOwner && application.status !== "NEEDS_INFO") {
    return NextResponse.json(
      { error: "You can only reply when more information is requested." },
      { status: 403 },
    );
  }

  const body = bodySchema.parse(await req.json());
  const message = await createApplicationMessage({
    applicationId: id,
    authorId: user.id,
    authorRole: isAdmin && !isOwner ? "ADMIN" : "CARRIER",
    body: body.body,
  });

  if (isOwner && application.status === "NEEDS_INFO") {
    await db.onboardingApplication.update({
      where: { id },
      data: { status: "IN_PROGRESS" },
    });
  }

  return NextResponse.json({
    message: {
      id: message.id,
      body: message.body,
      authorRole: message.authorRole,
      authorEmail: message.author.email,
      createdAt: message.createdAt.toISOString(),
    },
    status: isOwner ? "IN_PROGRESS" : application.status,
  });
}
