"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
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

export function ApplicationsTable({
  data,
  carrierTypes,
}: {
  data: ApplicationRow[];
  carrierTypes: CarrierTypeOption[];
}) {
  const [statusFilter, setStatusFilter] = useState("");
  const [carrierFilter, setCarrierFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);

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

  const allFilteredSelected =
    filteredData.length > 0 &&
    filteredData.every((row) => selectedIds.has(row.id));

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllFiltered() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        for (const row of filteredData) next.delete(row.id);
      } else {
        for (const row of filteredData) next.add(row.id);
      }
      return next;
    });
  }

  async function exportSelected() {
    if (selectedIds.size === 0) return;
    setExporting(true);
    try {
      const res = await fetch("/api/admin/applications/bulk-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selectedIds] }),
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `applications-export-${new Date().toISOString().slice(0, 10)}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  const columns: DataTableColumn<ApplicationRow>[] = [
    {
      id: "select",
      header: "",
      sortable: false,
      cell: (row) => (
        <input
          type="checkbox"
          aria-label={`Select ${row.email}`}
          checked={selectedIds.has(row.id)}
          onChange={() => toggleRow(row.id)}
        />
      ),
    },
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

  const toolbar = (
    <>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={allFilteredSelected && filteredData.length > 0}
          onChange={toggleAllFiltered}
          aria-label="Select all filtered applications"
        />
        <span>Select page filter</span>
      </label>
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
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={selectedIds.size === 0 || exporting}
        onClick={exportSelected}
      >
        {exporting
          ? "Exporting…"
          : `Export selected (${selectedIds.size})`}
      </Button>
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
