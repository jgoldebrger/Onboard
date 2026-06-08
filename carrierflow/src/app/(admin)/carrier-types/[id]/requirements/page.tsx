import Link from "next/link";
import { notFound } from "next/navigation";
import { CarrierRequirementsEditor } from "@/components/admin/carrier-requirements-editor";
import {
  getManagedCarrierRequirements,
  getMergedCarrierRequirements,
} from "@/lib/rules/carrier-requirements";
import { db } from "@/lib/db";
import { requireAdminPage } from "../../../_lib";

type Params = { params: Promise<{ id: string }> };

export default async function CarrierTypeRequirementsPage({ params }: Params) {
  await requireAdminPage("config:manage");
  const { id } = await params;

  const carrierType = await db.carrierType.findUnique({ where: { id } });
  if (!carrierType) notFound();

  const [questions, documentTypes, managed, effective] = await Promise.all([
    db.question.findMany({
      where: { isActive: true },
      orderBy: { key: "asc" },
      select: { id: true, key: true, label: true, type: true },
    }),
    db.documentType.findMany({
      where: { isActive: true },
      orderBy: { key: "asc" },
      select: { id: true, key: true, name: true, description: true },
    }),
    getManagedCarrierRequirements(carrierType.slug),
    getMergedCarrierRequirements(carrierType.slug),
  ]);

  return (
    <div className="space-y-4">
      <Link
        href={`/carrier-types/${id}/edit`}
        className="text-sm text-primary hover:underline"
      >
        ← Edit {carrierType.name}
      </Link>
      <CarrierRequirementsEditor
        carrierType={{
          id: carrierType.id,
          slug: carrierType.slug,
          name: carrierType.name,
        }}
        questions={questions}
        documentTypes={documentTypes}
        initialQuestionIds={managed.questionIds}
        initialDocumentTypeIds={managed.documentTypeIds}
        effectiveQuestionIds={effective.questionIds}
        effectiveDocumentTypeIds={effective.documentTypeIds}
      />
    </div>
  );
}
