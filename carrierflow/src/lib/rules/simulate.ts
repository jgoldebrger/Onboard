import { db } from "@/lib/db";
import type { EvaluationContext } from "@/types/domain";
import { evaluateRules } from "@/lib/rules";

export type SimulatedRequirement = {
  id: string;
  key: string;
  name: string;
};

export type RulesSimulationResult = {
  requiredQuestions: SimulatedRequirement[];
  requiredDocuments: SimulatedRequirement[];
  blocked: boolean;
  blockReasons: string[];
  riskAdditions: { ruleId: string; points: number; label: string }[];
};

export async function simulateRules(input: {
  carrierTypeSlug: string;
  answers?: Record<string, unknown>;
}): Promise<RulesSimulationResult> {
  const carrierType = await db.carrierType.findFirst({
    where: { slug: input.carrierTypeSlug, isActive: true },
  });

  const answers = new Map<string, unknown>();
  if (input.answers) {
    for (const [key, value] of Object.entries(input.answers)) {
      answers.set(key, value);
    }
  }

  const context: EvaluationContext = {
    carrierTypeId: carrierType?.id,
    carrierTypeSlug: input.carrierTypeSlug,
    answers,
    documents: new Map(),
  };

  const result = await evaluateRules(context);

  const [questions, documents] = await Promise.all([
    db.question.findMany({
      where: { id: { in: result.requiredQuestionIds } },
      select: { id: true, key: true, label: true },
    }),
    db.documentType.findMany({
      where: { id: { in: result.requiredDocumentTypeIds } },
      select: { id: true, key: true, name: true },
    }),
  ]);

  const questionById = new Map(questions.map((q) => [q.id, q]));
  const documentById = new Map(documents.map((d) => [d.id, d]));

  return {
    requiredQuestions: result.requiredQuestionIds.map((id) => {
      const q = questionById.get(id);
      return {
        id,
        key: q?.key ?? id,
        name: q?.label ?? id,
      };
    }),
    requiredDocuments: result.requiredDocumentTypeIds.map((id) => {
      const d = documentById.get(id);
      return {
        id,
        key: d?.key ?? id,
        name: d?.name ?? id,
      };
    }),
    blocked: result.blocked,
    blockReasons: result.blockReasons,
    riskAdditions: result.riskAdditions,
  };
}
