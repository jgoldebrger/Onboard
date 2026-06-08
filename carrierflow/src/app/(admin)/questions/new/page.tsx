import { requireAdminPage } from "../../_lib";
import { QuestionForm } from "../question-form";

export default async function NewQuestionPage() {
  await requireAdminPage("config:manage");

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">New question</h1>
      <QuestionForm />
    </div>
  );
}
