"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";

export type ApplicationRow = {
  id: string;
  email: string;
  companyName: string | null;
  status: string;
  carrierTypeName: string | null;
  carrierTypeId: string | null;
  riskScore: number;
  riskLevel: string;
  updatedAt: string;
};

type CarrierTypeOption = { id: string; name: string };

const columns: DataTableColumn<ApplicationRow>[] = [
  {
    id: "applicant",
    header: "Applicant",
    cell: (row) => (
      <div>
        <div>{row.email}</div>
        {row.companyName ? (
          <div className="text-xs text-muted-foreground">{row.companyName}</div>
        ) : null}
      </div>
    ),
    sortValue: (row) => row.email,
    filterValue: (row) =>
      [row.email, row.companyName].filter(Boolean).join(" "),
  },
  {
    id: "status",
    header: "Status",
    cell: (row) => row.status,
    sortValue: (row) => row.status,
  },
  {
    id: "carrierType",
    header: "Carrier type",
    cell: (row) => row.carrierTypeName ?? "—",
    sortValue: (row) => row.carrierTypeName ?? "",
  },
  {
    id: "risk",
    header: "Risk",
    cell: (row) => `${row.riskScore} (${row.riskLevel})`,
    sortValue: (row) => row.riskScore,
  },
  {
    id: "updated",
    header: "Updated",
    cell: (row) => new Date(row.updatedAt).toLocaleString(),
    sortValue: (row) => row.updatedAt,
  },
  {
    id: "actions",
    header: "",
    sortable: false,
    cell: (row) => (
      <Link
        href={`/carriers/${row.id}`}
        className="text-primary hover:underline"
      >
        Open
      </Link>
    ),
  },
];

export function ApplicationsTable({
  data,
  carrierTypes,
}: {
  data: ApplicationRow[];
  carrierTypes: CarrierTypeOption[];
}) {
  const [statusFilter, setStatusFilter] = useState("");
  const [carrierFilter, setCarrierFilter] = useState("");

  const filteredData = useMemo(() => {
    return data.filter((row) => {
      if (statusFilter && row.status !== statusFilter) return false;
      if (carrierFilter && row.carrierTypeId !== carrierFilter) return false;
      return true;
    });
  }, [data, statusFilter, carrierFilter]);

  const statuses = useMemo(
    () => [...new Set(data.map((r) => r.status))].sort(),
    [data],
  );

  const toolbar = (
    <>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Status</span>
        <select
          className="rounded-md border border-input bg-card px-2 py-1 text-foreground"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Carrier type</span>
        <select
          className="rounded-md border border-input bg-card px-2 py-1 text-foreground"
          value={carrierFilter}
          onChange={(e) => setCarrierFilter(e.target.value)}
        >
          <option value="">All</option>
          {carrierTypes.map((ct) => (
            <option key={ct.id} value={ct.id}>
              {ct.name}
            </option>
          ))}
        </select>
      </label>
    </>
  );

  return (
    <DataTable
      data={filteredData}
      columns={columns}
      getRowId={(row) => row.id}
      emptyMessage="No applications found."
      filterPlaceholder="Filter applications…"
      toolbar={toolbar}
      defaultPageSize={25}
    />
  );
}
