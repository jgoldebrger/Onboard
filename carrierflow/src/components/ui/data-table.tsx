"use client";

import {
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type DataTableColumn<T> = {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** Used for sorting; defaults to stringified cell text when omitted. */
  sortValue?: (row: T) => string | number | boolean | null | undefined;
  /** Used for global filter matching; defaults to sortValue string when omitted. */
  filterValue?: (row: T) => string;
  sortable?: boolean;
  /** Whether the column appears in the table and column picker (default true). */
  defaultVisible?: boolean;
  headerClassName?: string;
  cellClassName?: string;
};

export type DataTableProps<T> = {
  data: T[];
  columns: DataTableColumn<T>[];
  getRowId: (row: T) => string;
  emptyMessage?: string;
  filterPlaceholder?: string;
  defaultPageSize?: number;
  pageSizeOptions?: number[];
  toolbar?: ReactNode;
  className?: string;
};

type SortDirection = "asc" | "desc";

function compareValues(
  a: string | number | boolean | null | undefined,
  b: string | number | boolean | null | undefined,
): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === "boolean" && typeof b === "boolean") {
    return Number(a) - Number(b);
  }
  if (typeof a === "number" && typeof b === "number") {
    return a - b;
  }
  return String(a).localeCompare(String(b), undefined, { sensitivity: "base" });
}

function getDefaultSortValue<T>(column: DataTableColumn<T>, row: T): string {
  if (column.sortValue) {
    const v = column.sortValue(row);
    return v == null ? "" : String(v);
  }
  if (column.filterValue) {
    return column.filterValue(row);
  }
  return "";
}

export function DataTable<T>({
  data,
  columns,
  getRowId,
  emptyMessage = "No rows found.",
  filterPlaceholder = "Filter rows…",
  defaultPageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
  toolbar,
  className,
}: DataTableProps<T>) {
  const hideableColumns = useMemo(
    () => columns.filter((c) => c.defaultVisible !== false),
    [columns],
  );

  const [filter, setFilter] = useState("");
  const [sortColumnId, setSortColumnId] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [visibleColumnIds, setVisibleColumnIds] = useState<string[]>(() =>
    hideableColumns.map((c) => c.id),
  );
  const [columnsOpen, setColumnsOpen] = useState(false);

  const visibleColumns = useMemo(
    () => columns.filter((c) => visibleColumnIds.includes(c.id)),
    [columns, visibleColumnIds],
  );

  const filteredRows = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return data;
    return data.filter((row) =>
      columns.some((col) => {
        const raw = col.filterValue
          ? col.filterValue(row)
          : getDefaultSortValue(col, row);
        return raw.toLowerCase().includes(q);
      }),
    );
  }, [data, columns, filter]);

  const sortedRows = useMemo(() => {
    if (!sortColumnId) return filteredRows;
    const column = columns.find((c) => c.id === sortColumnId);
    if (!column) return filteredRows;
    const sorted = [...filteredRows].sort((a, b) => {
      const av = column.sortValue
        ? column.sortValue(a)
        : getDefaultSortValue(column, a);
      const bv = column.sortValue
        ? column.sortValue(b)
        : getDefaultSortValue(column, b);
      return compareValues(av, bv);
    });
    if (sortDirection === "desc") sorted.reverse();
    return sorted;
  }, [filteredRows, sortColumnId, sortDirection, columns]);

  const pageCount = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const clampedPageIndex = Math.min(pageIndex, Math.max(0, pageCount - 1));

  const paginatedRows = useMemo(() => {
    const start = clampedPageIndex * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, clampedPageIndex, pageSize]);

  const toggleSort = useCallback((columnId: string) => {
    const column = columns.find((c) => c.id === columnId);
    if (!column || column.sortable === false) return;
    setPageIndex(0);
    if (sortColumnId !== columnId) {
      setSortColumnId(columnId);
      setSortDirection("asc");
      return;
    }
    if (sortDirection === "asc") {
      setSortDirection("desc");
      return;
    }
    setSortColumnId(null);
    setSortDirection("asc");
  }, [columns, sortColumnId, sortDirection]);

  const toggleColumn = (columnId: string) => {
    setVisibleColumnIds((prev) => {
      if (prev.includes(columnId)) {
        if (prev.length <= 1) return prev;
        return prev.filter((id) => id !== columnId);
      }
      return [...prev, columnId];
    });
  };

  const rangeStart =
    sortedRows.length === 0 ? 0 : clampedPageIndex * pageSize + 1;
  const rangeEnd = Math.min(
    sortedRows.length,
    (clampedPageIndex + 1) * pageSize,
  );

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <Input
            type="search"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPageIndex(0);
            }}
            placeholder={filterPlaceholder}
            className="max-w-xs"
            aria-label="Filter table"
          />
          {toolbar}
        </div>
        <div className="relative">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setColumnsOpen((o) => !o)}
            aria-expanded={columnsOpen}
          >
            Columns
          </Button>
          {columnsOpen ? (
            <>
              <button
                type="button"
                className="fixed inset-0 z-10 cursor-default"
                aria-label="Close column menu"
                onClick={() => setColumnsOpen(false)}
              />
              <div className="absolute right-0 z-20 mt-1 w-52 rounded-md border border-border bg-card p-2 shadow-md">
                <p className="mb-2 px-2 text-xs font-medium text-muted-foreground">
                  Show columns
                </p>
                <ul className="max-h-60 space-y-1 overflow-y-auto">
                  {columns.map((col) => (
                    <li key={col.id}>
                      <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted">
                        <input
                          type="checkbox"
                          className="rounded border-input"
                          checked={visibleColumnIds.includes(col.id)}
                          onChange={() => toggleColumn(col.id)}
                        />
                        {col.header}
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : null}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-muted/60">
            <tr>
              {visibleColumns.map((col) => {
                const isSorted = sortColumnId === col.id;
                const canSort = col.sortable !== false;
                return (
                  <th
                    key={col.id}
                    scope="col"
                    className={cn(
                      "px-4 py-2 text-left font-medium text-foreground",
                      canSort && "cursor-pointer select-none hover:bg-muted",
                      col.headerClassName,
                    )}
                    onClick={canSort ? () => toggleSort(col.id) : undefined}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.header}
                      {canSort ? (
                        <span className="text-muted-foreground" aria-hidden>
                          {isSorted
                            ? sortDirection === "asc"
                              ? "↑"
                              : "↓"
                            : "↕"}
                        </span>
                      ) : null}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {paginatedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleColumns.length || 1}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedRows.map((row) => (
                <tr key={getRowId(row)} className="hover:bg-muted/40">
                  {visibleColumns.map((col) => (
                    <td
                      key={col.id}
                      className={cn(
                        "px-4 py-2 align-top text-card-foreground",
                        col.cellClassName,
                      )}
                    >
                      {col.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground">
          {sortedRows.length === 0
            ? "0 rows"
            : `Showing ${rangeStart}–${rangeEnd} of ${sortedRows.length}`}
          {filter ? ` (filtered from ${data.length})` : null}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-muted-foreground">
            <span>Rows per page</span>
            <select
              className="rounded-md border border-input bg-card px-2 py-1 text-foreground"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPageIndex(0);
              }}
            >
              {pageSizeOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={clampedPageIndex <= 0}
            onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
          >
            Previous
          </Button>
          <span className="min-w-[5rem] text-center text-muted-foreground">
            Page {clampedPageIndex + 1} of {pageCount}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={clampedPageIndex >= pageCount - 1}
            onClick={() =>
              setPageIndex((p) => Math.min(pageCount - 1, p + 1))
            }
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
