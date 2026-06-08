import Link from "next/link";
import { db } from "@/lib/db";
import { parseQuestionValidation } from "@/lib/questions/validation";
import { requireAdminPage } from "../_lib";
import {
  QuestionsTable,
  type QuestionRow,
} from "../_components/tables/questions-table";

export default async function QuestionsPage() {
  await requireAdminPage("config:manage");

  const questions = await db.question.findMany({
    orderBy: { key: "asc" },
  });

  const rows: QuestionRow[] = questions.map((q) => {
    const preset = parseQuestionValidation(q.validation).preset;
    return {
      id: q.id,
      key: q.key,
      label: q.label,
      type: q.type,
      validatorLabel: preset ? preset.toUpperCase() : "—",
      isActive: q.isActive,
    };
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Questions</h1>
        <Link
          href="/questions/new"
          className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90"
        >
          New question
        </Link>
      </div>

      <QuestionsTable data={rows} />
    </div>
  );
}
