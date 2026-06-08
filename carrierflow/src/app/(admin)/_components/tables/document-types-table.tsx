"use client";

import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";

export type DocumentTypeRow = {
  id: string;
  key: string;
  name: string;
  mimeTypes: string;
  isActive: boolean;
};

const columns: DataTableColumn<DocumentTypeRow>[] = [
  {
    id: "key",
    header: "Key",
    cell: (row) => <span className="font-mono text-xs">{row.key}</span>,
    sortValue: (row) => row.key,
    cellClassName: "font-mono text-xs",
  },
  {
    id: "name",
    header: "Name",
    cell: (row) => row.name,
    sortValue: (row) => row.name,
  },
  {
    id: "mime",
    header: "MIME types",
    cell: (row) => (
      <span className="text-xs text-muted-foreground">{row.mimeTypes}</span>
    ),
    sortValue: (row) => row.mimeTypes,
  },
  {
    id: "active",
    header: "Active",
    cell: (row) => (row.isActive ? "Yes" : "No"),
    sortValue: (row) => row.isActive,
  },
  {
    id: "actions",
    header: "",
    sortable: false,
    cell: (row) => (
      <Link
        href={`/documents/${row.id}/edit`}
        className="text-primary hover:underline"
      >
        Edit
      </Link>
    ),
  },
];

export function DocumentTypesTable({ data }: { data: DocumentTypeRow[] }) {
  return (
    <DataTable
      data={data}
      columns={columns}
      getRowId={(row) => row.id}
      emptyMessage="No document types found."
      filterPlaceholder="Filter document types…"
    />
  );
}
