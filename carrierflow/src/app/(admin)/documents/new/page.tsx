import { requireAdminPage } from "../../_lib";
import { DocumentTypeForm } from "../document-type-form";

export default async function NewDocumentTypePage() {
  await requireAdminPage("config:manage");

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">New document type</h1>
      <DocumentTypeForm />
    </div>
  );
}
