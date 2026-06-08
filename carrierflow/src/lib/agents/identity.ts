import OpenAI from "openai";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { logAgentRun, resolveAgentConfig } from "@/lib/agents/resolve-config";
import { loadDocumentBytes } from "@/lib/ocr";

const identityResultSchema = z.object({
  faceDetected: z.boolean(),
  match: z.boolean(),
  confidence: z.number().min(0).max(1),
  extractedIdData: z.record(z.string(), z.unknown()).optional(),
});

export type IdentityCompareResult = z.infer<typeof identityResultSchema>;

const IDENTITY_PROMPT = `Compare the face on the driver's license to the selfie.
Extract name and document number if visible. Always recommend human review for final approval.
Return conservative match scores when image quality is poor.`;

export async function runIdentityCompare(params: {
  dlStorageKey: string;
  selfieStorageKey: string;
}): Promise<IdentityCompareResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      faceDetected: true,
      match: false,
      confidence: 0,
      extractedIdData: {},
    };
  }

  const agentConfig = await resolveAgentConfig("document_review", IDENTITY_PROMPT);
  const openai = new OpenAI({ apiKey });
  const started = Date.now();

  try {
    const [dlBuf, selfieBuf] = await Promise.all([
      loadDocumentBytes(params.dlStorageKey),
      loadDocumentBytes(params.selfieStorageKey),
    ]);

    const dlUrl = `data:image/jpeg;base64,${dlBuf.toString("base64")}`;
    const selfieUrl = `data:image/jpeg;base64,${selfieBuf.toString("base64")}`;

    const completion = await openai.chat.completions.parse({
      model: agentConfig.visionEnabled ? agentConfig.model : "gpt-4o",
      messages: [
        { role: "system", content: agentConfig.systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: "Driver license image:" },
            { type: "image_url", image_url: { url: dlUrl } },
            { type: "text", text: "Selfie image:" },
            { type: "image_url", image_url: { url: selfieUrl } },
          ],
        },
      ],
      response_format: zodResponseFormat(identityResultSchema, "identity_compare"),
    });

    const parsed = completion.choices[0]?.message?.parsed;
    if (!parsed) {
      return { faceDetected: true, match: false, confidence: 0 };
    }

    await logAgentRun({
      agentConfigKey: "document_review",
      promptVersionId: agentConfig.promptVersionId,
      latencyMs: Date.now() - started,
      confidence: parsed.confidence,
      success: true,
      metadata: { match: parsed.match },
    });

    return parsed;
  } catch {
    return {
      faceDetected: true,
      match: false,
      confidence: 0,
      extractedIdData: {},
    };
  }
}
