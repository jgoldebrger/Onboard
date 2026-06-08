/** Interview collects DOT first, then identity fields from FMCSA cross-reference. */
const INTERVIEW_QUESTION_PRIORITY = [
  "dot_number",
  "company_legal_name",
  "mc_number",
  "fleet_size",
  "has_lift_gate",
] as const;

export function sortInterviewQuestions<T extends { key: string }>(
  questions: T[],
): T[] {
  const rank = new Map(
    INTERVIEW_QUESTION_PRIORITY.map((key, index) => [key, index]),
  );
  return [...questions].sort((a, b) => {
    const ra = rank.get(a.key) ?? 1000;
    const rb = rank.get(b.key) ?? 1000;
    if (ra !== rb) return ra - rb;
    return a.key.localeCompare(b.key);
  });
}

export function isDotQuestionKey(key: string): boolean {
  return key === "dot_number";
}
