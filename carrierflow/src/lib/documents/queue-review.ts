import { after } from "next/server";
import { inngest } from "@/inngest/client";
import { processDocumentReview } from "@/lib/documents/process-review";

function scheduleInlineReview(documentId: string) {
  after(async () => {
    try {
      await processDocumentReview(documentId);
    } catch (inlineErr) {
      console.error("Inline document review failed", documentId, inlineErr);
    }
  });
}

/**
 * Queue document review via Inngest when available; always fall back to inline
 * processing in development (Inngest dev server is often not running).
 */
function shouldProcessReviewInline(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    !process.env.INNGEST_EVENT_KEY?.trim()
  );
}

export async function queueDocumentReview(documentId: string): Promise<void> {
  if (shouldProcessReviewInline()) {
    scheduleInlineReview(documentId);
    return;
  }

  try {
    await inngest.send({
      name: "document/uploaded",
      data: { documentId },
    });
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "Inngest send failed — processing document review inline",
        documentId,
        err,
      );
    }
    scheduleInlineReview(documentId);
  }
}
