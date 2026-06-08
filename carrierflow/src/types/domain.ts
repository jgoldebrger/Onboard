export type ConditionNode =
  | { type: "group"; op: "AND" | "OR"; children: ConditionNode[] }
  | { type: "clause"; field: string; operator: string; value: unknown };

export type RuleAction = {
  effect: "REQUIRE" | "OPTIONAL" | "BLOCK_APPROVAL" | "ADD_RISK";
  targetType: "question" | "document" | "carrier_type";
  targetId: string;
  params?: Record<string, unknown>;
};

export type EvaluationContext = {
  carrierTypeId?: string;
  carrierTypeSlug?: string;
  answers: Map<string, unknown>;
  documents: Map<
    string,
    { status: string; extractedData?: Record<string, unknown> }
  >;
  govData?: Record<string, unknown>;
  identityData?: Record<string, unknown>;
};

export type EvaluationResult = {
  requiredQuestionIds: string[];
  requiredDocumentTypeIds: string[];
  blocked: boolean;
  blockReasons: string[];
  riskAdditions: { ruleId: string; points: number; label: string }[];
};

export type RuleVersionSnapshot = {
  publishedRuleVersionIds: string[];
  capturedAt: string;
};

export type ApplicationProgress = {
  questionsAnswered: number;
  questionsRequired: number;
  documentsUploaded: number;
  documentsRequired: number;
};
