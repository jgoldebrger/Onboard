import type { MessageAuthorRole } from "@prisma/client";
import { db } from "@/lib/db";

export async function listApplicationMessages(applicationId: string) {
  return db.applicationMessage.findMany({
    where: { applicationId },
    include: { author: { select: { email: true } } },
    orderBy: { createdAt: "asc" },
  });
}

export async function createApplicationMessage(input: {
  applicationId: string;
  authorId: string;
  authorRole: MessageAuthorRole;
  body: string;
}) {
  return db.applicationMessage.create({
    data: {
      applicationId: input.applicationId,
      authorId: input.authorId,
      authorRole: input.authorRole,
      body: input.body.trim(),
    },
    include: { author: { select: { email: true } } },
  });
}
