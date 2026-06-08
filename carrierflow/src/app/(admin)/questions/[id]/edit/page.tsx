import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdminPage } from "../../../_lib";
import { DeleteButton } from "../../../_components/delete-button";
import { QuestionForm } from "../../question-form";

type Params = { params: Promise<{ id: string }> };

export default async function EditQuestionPage({ params }: Params) {
  await requireAdminPage("config:manage");
  const { id } = await params;

  const question = await db.question.findUnique({ where: { id } });
  if (!question) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Edit question</h1>
      <QuestionForm
        initial={{
          id: question.id,
          key: question.key,
          label: question.label,
          type: question.type,
          optionsJson: question.options
            ? JSON.stringify(question.options, null, 2)
            : "",
          validationJson: question.validation
            ? JSON.stringify(question.validation, null, 2)
            : "",
          isActive: question.isActive,
        }}
      />
      <DeleteButton
        apiPath={`/api/admin/questions/${id}`}
        redirectTo="/questions"
      />
    </div>
  );
}
