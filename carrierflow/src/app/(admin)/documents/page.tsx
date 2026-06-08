import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdminPage } from "../_lib";
import {
  DocumentTypesTable,
  type DocumentTypeRow,
} from "../_components/tables/document-types-table";

export default async function DocumentTypesPage() {
  await requireAdminPage("config:manage");

  const documentTypes = await db.documentType.findMany({
    orderBy: { key: "asc" },
  });

  const rows: DocumentTypeRow[] = documentTypes.map((dt) => ({
    id: dt.id,
    key: dt.key,
    name: dt.name,
    mimeTypes: Array.isArray(dt.mimeTypes)
      ? (dt.mimeTypes as string[]).join(", ")
      : String(dt.mimeTypes),
    isActive: dt.isActive,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Document types</h1>
        <Link
          href="/documents/new"
          className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90"
        >
          New document type
        </Link>
      </div>

      <DocumentTypesTable data={rows} />
    </div>
  );
}
