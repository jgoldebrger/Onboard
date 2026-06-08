import type { DocumentReviewStatus } from "@prisma/client";
import OpenAI from "openai";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import {
  extractDocumentText,
  isImageMimeType,
  isPdfMimeType,
} from "@/lib/ocr";
import {
  normalizeDocumentTypeKey,
  validateDocumentContent,
  type ContentValidationResult,
} from "@/lib/documents/type-validation";
import { logAgentRun, resolveAgentConfig } from "@/lib/agents/resolve-config";
import { DOCUMENT_REVIEW_SYSTEM_PROMPT } from "./prompts/defaults/document-review";

const MIN_PASS_CONFIDENCE = 0.75;

const documentReviewSchema = z.object({
  documentType: z.string(),
  confidence: z.number().min(0).max(1),
  /** OpenAI structured output does not support z.record (propertyNames). */
  extractedFields: z.array(
    z.object({
      name: z.string(),
      value: z.string().nullable(),
    }),
  ),
  ruleEvaluations: z.array(
    z.object({
      rule: z.string(),
      passed: z.boolean(),
      message: z.string().nullable(),
    }),
  ),
});

function fieldsFromExtracted(
  extracted: { name: string; value: string | null }[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const { name, value } of extracted) {
    if (name.trim()) out[name.trim()] = value;
  }
  return out;
}

type ParsedReview = z.infer<typeof documentReviewSchema>;

export type DocumentReviewAgentResult = {
  documentType: string;
  confidence: number;
  fields: Record<string, unknown>;
  ruleEvaluations: { rule: string; passed: boolean; message?: string }[];
  failureReasons: string[];
  status: DocumentReviewStatus;
};

function deriveReviewStatus(
  parsed: ParsedReview,
  expectedDocumentTypeKey: string | null | undefined,
  contentValidation: ContentValidationResult | null,
): Pick<DocumentReviewAgentResult, "status" | "failureReasons"> {
  const failureReasons = parsed.ruleEvaluations
    .filter((rule) => !rule.passed)
    .map((rule) => rule.message ?? rule.rule);

  if (contentValidation && !contentValidation.matches && contentValidation.reason) {
    failureReasons.unshift(contentValidation.reason);
  }

  const expected = expectedDocumentTypeKey
    ? normalizeDocumentTypeKey(expectedDocumentTypeKey)
    : null;
  const detected = normalizeDocumentTypeKey(parsed.documentType);

  if (expected && detected !== "unknown" && detected !== expected) {
    failureReasons.push(
      `Expected a ${expected.replace(/-/g, " ")} document but this file appears to be ${detected.replace(/-/g, " ")}.`,
    );
  }

  const typeRule = parsed.ruleEvaluations.find(
    (rule) => rule.rule === "document_type_match",
  );
  if (typeRule && !typeRule.passed) {
    failureReasons.push(
      typeRule.message ??
        "Document type does not match what was requested.",
    );
  }

  const hardFail =
    (contentValidation && !contentValidation.matches) ||
    (expected && detected !== "unknown" && detected !== expected) ||
    (typeRule && !typeRule.passed) ||
    parsed.ruleEvaluations.some(
      (rule) =>
        !rule.passed &&
        ["not_expired", "required_fields_present"].includes(rule.rule),
    );

  if (hardFail) {
    return { status: "FAILED", failureReasons };
  }

  if (
    parsed.confidence < MIN_PASS_CONFIDENCE ||
    detected === "unknown" ||
    failureReasons.length > 0
  ) {
    return { status: "NEEDS_REVIEW", failureReasons };
  }

  return { status: "PASSED", failureReasons: [] };
}

async function buildUserContent(params: {
  fileName: string;
  mimeType: string;
  fileBuffer: Buffer;
  expectedDocumentTypeKey?: string | null;
  extractedText: string;
}): Promise<OpenAI.Chat.Completions.ChatCompletionContentPart[]> {
  const expected = params.expectedDocumentTypeKey
    ? normalizeDocumentTypeKey(params.expectedDocumentTypeKey)
    : "unknown";
  const context = [
    `File name: ${params.fileName}`,
    `MIME type: ${params.mimeType}`,
    `Expected document type (required): ${expected}`,
    "Reject the upload unless the content clearly matches the expected type.",
  ].join("\n");

  if (isImageMimeType(params.mimeType)) {
    const dataUrl = `data:${params.mimeType};base64,${params.fileBuffer.toString("base64")}`;
    return [
      {
        type: "text",
        text: `${context}\n\nAnalyze the attached document image. Verify it is a ${expected} document.`,
      },
      { type: "image_url", image_url: { url: dataUrl } },
    ];
  }

  if (isPdfMimeType(params.mimeType)) {
    const excerpt =
      params.extractedText.length > 12_000
        ? `${params.extractedText.slice(0, 12_000)}\n…[truncated]`
        : params.extractedText;
    return [
      {
        type: "text",
        text: `${context}\n\nExtracted document text:\n---\n${excerpt || "(no text extracted)"}\n---\n\nClassify the document and run all rules. Fail document_type_match if this is not a ${expected}.`,
      },
    ];
  }

  return [
    {
      type: "text",
      text: `${context}\n\nUnsupported format; return documentType unknown, document_type_match failed, low confidence.`,
    },
  ];
}

export async function runDocumentReviewAgent(params: {
  fileName: string;
  mimeType: string;
  fileBuffer: Buffer;
  expectedDocumentTypeKey?: string | null;
}): Promise<DocumentReviewAgentResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      documentType: params.expectedDocumentTypeKey ?? "unknown",
      confidence: 0,
      fields: {},
      ruleEvaluations: [],
      failureReasons: ["OPENAI_API_KEY not configured — manual review required"],
      status: "NEEDS_REVIEW",
    };
  }

  const extractedText = await extractDocumentText(
    params.fileBuffer,
    params.mimeType,
    params.fileName,
  );

  const contentValidation = params.expectedDocumentTypeKey
    ? validateDocumentContent({
        expectedTypeKey: params.expectedDocumentTypeKey,
        extractedText,
        fileName: params.fileName,
      })
    : null;

  if (
    contentValidation &&
    !contentValidation.matches &&
    isPdfMimeType(params.mimeType) &&
    extractedText.length > 40
  ) {
    return {
      documentType: normalizeDocumentTypeKey(params.expectedDocumentTypeKey),
      confidence: 0,
      fields: {},
      ruleEvaluations: [
        {
          rule: "document_type_match",
          passed: false,
          message: contentValidation.reason,
        },
      ],
      failureReasons: [contentValidation.reason ?? "Wrong document type"],
      status: "FAILED",
    };
  }

  const agentConfig = await resolveAgentConfig(
    "document_review",
    DOCUMENT_REVIEW_SYSTEM_PROMPT,
  );
  const openai = new OpenAI({ apiKey });
  const started = Date.now();

  const completion = await openai.chat.completions.parse({
    model: agentConfig.model,
    temperature: agentConfig.temperature,
    max_tokens: agentConfig.maxTokens,
    messages: [
      { role: "system", content: agentConfig.systemPrompt },
      {
        role: "user",
        content: await buildUserContent({
          ...params,
          extractedText,
        }),
      },
    ],
    response_format: zodResponseFormat(documentReviewSchema, "document_review"),
  });

  const parsed = completion.choices[0]?.message?.parsed;
  if (!parsed) {
    return {
      documentType: params.expectedDocumentTypeKey ?? "unknown",
      confidence: 0,
      fields: {},
      ruleEvaluations: [],
      failureReasons: ["Document review agent returned no structured result"],
      status: "NEEDS_REVIEW",
    };
  }

  const { status, failureReasons } = deriveReviewStatus(
    parsed,
    params.expectedDocumentTypeKey,
    contentValidation,
  );

  await logAgentRun({
    agentConfigKey: "document_review",
    promptVersionId: agentConfig.promptVersionId,
    latencyMs: Date.now() - started,
    confidence: parsed.confidence,
    success: true,
    metadata: { documentType: parsed.documentType, status },
  });

  return {
    documentType: parsed.documentType,
    confidence: parsed.confidence,
    fields: fieldsFromExtracted(parsed.extractedFields),
    ruleEvaluations: parsed.ruleEvaluations.map((rule) => ({
      rule: rule.rule,
      passed: rule.passed,
      message: rule.message ?? undefined,
    })),
    failureReasons,
    status,
  };
}
