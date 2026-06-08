import { getSessionUser, hasPermission } from "@/lib/auth";
import { db } from "@/lib/db";

type Params = { params: Promise<{ applicationId: string; docId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { applicationId, docId } = await params;
  const user = await getSessionUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const application = await db.onboardingApplication.findUnique({
    where: { id: applicationId },
    select: { userId: true },
  });
  if (!application) {
    return new Response("Not found", { status: 404 });
  }
  if (
    application.userId !== user.id &&
    !hasPermission(user.role, "applications:read")
  ) {
    return new Response("Forbidden", { status: 403 });
  }

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        if (closed) return;
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`),
        );
      };

      for (let i = 0; i < 60 && !closed; i++) {
        const document = await db.carrierDocument.findFirst({
          where: { id: docId, applicationId },
          include: { review: true },
        });

        if (!document?.review) {
          send({ error: "not_found" });
          break;
        }

        const ruleResults = Array.isArray(document.review.ruleResults)
          ? document.review.ruleResults
          : [];

        send({
          status: document.review.status,
          reviewProgress: document.review.reviewProgress,
          reviewStep: document.review.reviewStep,
          ruleResults,
          failureReasons: document.review.failureReasons,
        });

        if (document.review.status !== "PROCESSING") {
          break;
        }

        await new Promise((r) => setTimeout(r, 2000));
      }

      controller.enqueue(encoder.encode("event: close\ndata: {}\n\n"));
      controller.close();
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
