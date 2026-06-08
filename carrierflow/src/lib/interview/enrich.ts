import { runInterviewAgent } from "@/lib/agents/interview";

/**
 * Optional background enrichment — logs agent run / future analytics.
 * Failures are ignored; answers are already saved by the fast path.
 */
export async function enrichInterviewInBackground(
  applicationId: string,
  userMessage: string,
): Promise<void> {
  try {
    await runInterviewAgent({
      applicationId,
      messages: [{ role: "user", content: userMessage }],
    });
  } catch (err) {
    console.warn("interview background enrich failed", err);
  }
}
