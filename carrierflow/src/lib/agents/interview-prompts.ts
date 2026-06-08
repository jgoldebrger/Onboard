import type { Question } from "@prisma/client";
import { parseQuestionValidation } from "@/lib/questions/validation";

export type QuestionForPrompt = Pick<
  Question,
  "key" | "label" | "type" | "validation"
>;

export function getQuestionAskPrompt(question: QuestionForPrompt): string {
  const config = parseQuestionValidation(question.validation);

  if (config.preset === "dot") {
    return `What is your ${question.label}? (Enter 1–8 digits, numbers only.)`;
  }
  if (config.preset === "mc") {
    return `What is your ${question.label}? (For example MC-123456.)`;
  }
  if (config.preset === "email") {
    return `What is your ${question.label}?`;
  }
  if (config.preset === "phone_us") {
    return `What is your ${question.label}? (10-digit US phone number.)`;
  }

  if (question.type === "YES_NO") {
    return `${question.label}? Please answer yes or no.`;
  }
  if (question.type === "NUMBER") {
    return `What is your ${question.label}? (Enter a number.)`;
  }

  return `What is your ${question.label}?`;
}

export function carrierTypeDisplayName(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function buildInterviewReply(params: {
  missingQuestions: QuestionForPrompt[];
  savedAnswerKeys?: string[];
  carrierTypeSlug?: string | null;
  blocked?: boolean;
  blockReasons?: string[];
}): string {
  const { missingQuestions, savedAnswerKeys, carrierTypeSlug, blocked, blockReasons } =
    params;

  if (blocked && blockReasons?.length) {
    return `Before we continue: ${blockReasons.join(" ")}`;
  }

  if (missingQuestions.length === 0) {
    if (savedAnswerKeys?.length) {
      return "Thanks — that's everything I need for the required questions. You can upload documents on the next step or submit when you're ready.";
    }
    return "You're all set on required questions for now. Upload any required documents or submit when you're ready.";
  }

  const next = missingQuestions[0];
  const ask = getQuestionAskPrompt(next);

  if (savedAnswerKeys?.length) {
    return `Got it. ${ask}`;
  }

  if (carrierTypeSlug) {
    return `You're set up as ${carrierTypeDisplayName(carrierTypeSlug)}. ${ask}`;
  }

  return ask;
}

/** Which question key a free-text reply should be saved against. */
export function resolveAnswerTargetKey(
  missingFields: string[],
  nextQuestions: string[],
): string | undefined {
  if (nextQuestions.length > 0) return nextQuestions[0];
  if (missingFields.length > 0) return missingFields[0];
  return undefined;
}
