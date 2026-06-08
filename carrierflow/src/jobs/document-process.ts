import { inngest } from "@/inngest/client";
import { processDocumentReview } from "@/lib/documents/process-review";

export const processDocument = inngest.createFunction(
  {
    id: "document/process",
    triggers: [{ event: "document/uploaded" }],
    idempotency: "event.data.documentId",
  },
  async ({ event, step }) => {
    const documentId = event.data.documentId as string;
    return step.run("process-document-review", () =>
      processDocumentReview(documentId),
    );
  },
);
