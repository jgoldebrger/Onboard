"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";

export type CarrierRow = {
  id: string;
  email: string;
  companyName: string | null;
  legalName: string | null;
  dotNumber: string | null;
  mcNumber: string | null;
  status: string;
  carrierTypeName: string | null;
  carrierTypeId: string | null;
  verificationStatus: string | null;
  riskScore: number;
  riskLevel: string;
  updatedAt: string;
};

type CarrierTypeOption = { id: string; name: string };

const columns: DataTableColumn<CarrierRow>[] = [
  {
    id: "carrier",
    header: "Carrier",
    cell: (row) => (
      <div>
        <div className="font-medium">
          {row.legalName ?? row.companyName ?? row.email}
        </div>
        <div className="text-xs text-muted-foreground">{row.email}</div>
      </div>
    ),
    sortValue: (row) => row.legalName ?? row.companyName ?? row.email,
    filterValue: (row) =>
      [row.legalName, row.companyName, row.email, row.dotNumber, row.mcNumber]
        .filter(Boolean)
        .join(" "),
  },
  {
    id: "dot",
    header: "DOT",
    cell: (row) => row.dotNumber ?? "—",
    sortValue: (row) => row.dotNumber ?? "",
  },
  {
    id: "mc",
    header: "MC",
    cell: (row) => row.mcNumber ?? "—",
    sortValue: (row) => row.mcNumber ?? "",
  },
  {
    id: "status",
    header: "Status",
    cell: (row) => row.status,
    sortValue: (row) => row.status,
  },
  {
    id: "safer",
    header: "SAFER",
    cell: (row) => row.verificationStatus ?? "—",
    sortValue: (row) => row.verificationStatus ?? "",
  },
  {
    id: "carrierType",
    header: "Type",
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
      <Link href={`/carriers/${row.id}`} className="text-primary hover:underline">
        Open
      </Link>
    ),
  },
];

export function CarriersTable({
  data,
  carrierTypes,
}: {
  data: CarrierRow[];
  carrierTypes: CarrierTypeOption[];
}) {
  const [statusFilter, setStatusFilter] = useState("");
  const [carrierFilter, setCarrierFilter] = useState("");
  const [saferFilter, setSaferFilter] = useState("");

  const filteredData = useMemo(() => {
    return data.filter((row) => {
      if (statusFilter && row.status !== statusFilter) return false;
      if (carrierFilter && row.carrierTypeId !== carrierFilter) return false;
      if (saferFilter === "synced" && !row.verificationStatus) return false;
      if (saferFilter === "none" && row.verificationStatus) return false;
      return true;
    });
  }, [data, statusFilter, carrierFilter, saferFilter]);

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
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>SAFER</span>
        <select
          className="rounded-md border border-input bg-card px-2 py-1 text-foreground"
          value={saferFilter}
          onChange={(e) => setSaferFilter(e.target.value)}
        >
          <option value="">All</option>
          <option value="synced">Synced</option>
          <option value="none">Not synced</option>
        </select>
      </label>
    </>
  );

  return (
    <DataTable
      data={filteredData}
      columns={columns}
      getRowId={(row) => row.id}
      emptyMessage="No carriers found."
      filterPlaceholder="Filter carriers…"
      toolbar={toolbar}
      defaultPageSize={25}
    />
  );
}
