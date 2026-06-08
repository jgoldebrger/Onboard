import { z } from "zod";
import type { ConditionNode } from "@/types/domain";

const conditionClauseSchema = z.object({
  type: z.literal("clause"),
  field: z.string().min(1),
  operator: z.string().min(1),
  value: z.unknown(),
});

export const conditionNodeSchema: z.ZodType<ConditionNode> = z.lazy(() =>
  z.discriminatedUnion("type", [
    z.object({
      type: z.literal("group"),
      op: z.enum(["AND", "OR"]),
      children: z.array(conditionNodeSchema).min(1),
    }),
    conditionClauseSchema,
  ]),
);

export const ruleActionSchema = z.object({
  effect: z.enum(["REQUIRE", "OPTIONAL", "BLOCK_APPROVAL", "ADD_RISK"]),
  targetType: z.enum(["question", "document", "carrier_type"]),
  targetId: z.string().min(1),
  params: z.record(z.string(), z.unknown()).optional(),
});

export const createRuleSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  priority: z.number().int().min(0).max(10000).optional(),
  conditions: conditionNodeSchema,
  actions: z.array(ruleActionSchema).min(1),
});

export const toggleRuleSchema = z.object({
  isEnabled: z.boolean().optional(),
});
