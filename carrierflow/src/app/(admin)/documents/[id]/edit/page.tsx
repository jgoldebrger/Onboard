import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdminPage } from "../../../_lib";
import { DeleteButton } from "../../../_components/delete-button";
import { DocumentTypeForm } from "../../document-type-form";

type Params = { params: Promise<{ id: string }> };

export default async function EditDocumentTypePage({ params }: Params) {
  await requireAdminPage("config:manage");
  const { id } = await params;

  const documentType = await db.documentType.findUnique({ where: { id } });
  if (!documentType) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Edit document type</h1>
      <DocumentTypeForm
        initial={{
          id: documentType.id,
          key: documentType.key,
          name: documentType.name,
          description: documentType.description ?? "",
          mimeTypes: documentType.mimeTypes.join(", "),
          isActive: documentType.isActive,
        }}
      />
      <DeleteButton
        apiPath={`/api/admin/document-types/${id}`}
        redirectTo="/documents"
      />
    </div>
  );
}
