"use client";

import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";

export type CarrierTypeRow = {
  id: string;
  name: string;
  slug: string;
  partnerName: string;
  isActive: boolean;
  version: number;
};

const columns: DataTableColumn<CarrierTypeRow>[] = [
  {
    id: "name",
    header: "Name",
    cell: (row) => row.name,
    sortValue: (row) => row.name,
  },
  {
    id: "slug",
    header: "Slug",
    cell: (row) => <span className="font-mono text-xs">{row.slug}</span>,
    sortValue: (row) => row.slug,
    cellClassName: "font-mono text-xs",
  },
  {
    id: "partner",
    header: "Partner",
    cell: (row) => row.partnerName,
    sortValue: (row) => row.partnerName,
  },
  {
    id: "active",
    header: "Active",
    cell: (row) => (row.isActive ? "Yes" : "No"),
    sortValue: (row) => row.isActive,
  },
  {
    id: "version",
    header: "Version",
    cell: (row) => row.version,
    sortValue: (row) => row.version,
  },
  {
    id: "actions",
    header: "",
    sortable: false,
    cell: (row) => (
      <span className="space-x-3">
        <Link
          href={`/carrier-types/${row.id}/requirements`}
          className="font-medium text-primary hover:underline"
        >
          Requirements
        </Link>
        <Link
          href={`/carrier-types/${row.id}/edit`}
          className="text-muted-foreground hover:text-foreground hover:underline"
        >
          Edit
        </Link>
      </span>
    ),
  },
];

export function CarrierTypesTable({ data }: { data: CarrierTypeRow[] }) {
  return (
    <DataTable
      data={data}
      columns={columns}
      getRowId={(row) => row.id}
      emptyMessage="No carrier types found."
      filterPlaceholder="Filter carrier types…"
    />
  );
}
