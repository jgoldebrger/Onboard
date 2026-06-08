import { db } from "@/lib/db";
import type {
  ConditionNode,
  EvaluationContext,
  EvaluationResult,
  RuleAction,
} from "@/types/domain";
import {
  applyActions,
  emptyEvaluationResult,
  evaluateCondition,
} from "./evaluator";

export type PublishedRule = {
  id: string;
  priority: number;
  ruleVersionId: string;
  conditions: ConditionNode;
  actions: RuleAction[];
};

export async function loadPublishedRules(): Promise<PublishedRule[]> {
  const rules = await db.rule.findMany({
    where: {
      isEnabled: true,
      ruleVersion: { isPublished: true },
    },
    include: { ruleVersion: true },
    orderBy: { priority: "asc" },
  });

  return rules.map((rule) => ({
    id: rule.id,
    priority: rule.priority,
    ruleVersionId: rule.ruleVersionId,
    conditions: rule.ruleVersion.conditions as ConditionNode,
    actions: rule.ruleVersion.actions as RuleAction[],
  }));
}

export async function evaluateRules(
  context: EvaluationContext,
  rules?: PublishedRule[],
): Promise<EvaluationResult> {
  const activeRules = rules ?? (await loadPublishedRules());
  const result = emptyEvaluationResult();

  for (const rule of activeRules) {
    if (evaluateCondition(rule.conditions, context)) {
      applyActions(rule.actions, result, rule.id);
    }
  }

  return result;
}

export async function buildEvaluationContext(
  applicationId: string,
): Promise<EvaluationContext> {
  const application = await db.onboardingApplication.findUnique({
    where: { id: applicationId },
    include: {
      answers: { include: { question: true } },
      documents: { include: { review: true } },
      carrierType: true,
      govVerifications: { orderBy: { verifiedAt: "desc" }, take: 1 },
      identityVerification: true,
    },
  });

  if (!application) {
    throw new Error(`Application not found: ${applicationId}`);
  }

  const answers = new Map<string, unknown>();
  for (const answer of application.answers) {
    answers.set(answer.questionId, answer.value);
    answers.set(answer.question.key, answer.value);
  }

  const documents = new Map<
    string,
    { status: string; extractedData?: Record<string, unknown> }
  >();
  for (const doc of application.documents) {
    const key = doc.documentTypeId ?? doc.id;
    documents.set(key, {
      status: doc.review?.status ?? "PENDING",
      extractedData: doc.review?.extractedData as
        | Record<string, unknown>
        | undefined,
    });
  }

  const latestGov = application.govVerifications[0];
  const govData = latestGov
    ? {
        dotNumber: latestGov.dotNumber,
        mcNumber: latestGov.mcNumber,
        companyName: latestGov.companyName,
        dotStatus: latestGov.dotStatus,
        mcStatus: latestGov.mcStatus,
        authorityStatus: latestGov.authorityStatus,
        matchScore: latestGov.matchScore,
        riskFlags: latestGov.riskFlags,
        status: latestGov.status,
      }
    : undefined;

  const identity = application.identityVerification;
  const identityData = identity
    ? {
        faceDetected: identity.faceDetected,
        match: identity.match,
        confidence: identity.confidence,
        status: identity.status,
        requiresHumanReview: identity.requiresHumanReview,
      }
    : undefined;

  return {
    carrierTypeId: application.carrierTypeId ?? undefined,
    carrierTypeSlug: application.carrierType?.slug,
    answers,
    documents,
    govData,
    identityData,
  };
}

export async function resolveRequirements(
  applicationId: string,
): Promise<EvaluationResult> {
  const context = await buildEvaluationContext(applicationId);
  return evaluateRules(context);
}

export {
  applyActions,
  emptyEvaluationResult,
  evaluateCondition,
} from "./evaluator";
