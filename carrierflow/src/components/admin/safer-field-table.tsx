"use client";

import {
  formatSaferFieldLabel,
  formatSaferFieldValue,
} from "@/lib/fmcsa/display-format";

/** Readable two-column table for SAFER / FMCSA fields (not raw JSON cards). */
export function SaferFieldTable({
  data,
  className,
}: {
  data: Record<string, unknown>;
  className?: string;
}) {
  const entries = Object.entries(data).filter(
    ([, v]) => v !== undefined && v !== null && v !== "",
  );

  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No data in this section.
      </p>
    );
  }

  return (
    <div className={className}>
      <table className="w-full border-collapse text-sm">
        <tbody>
          {entries.map(([key, value]) => (
            <tr key={key} className="border-b border-border last:border-0">
              <th className="w-1/3 py-2.5 pr-4 text-left align-top font-medium text-muted-foreground">
                {formatSaferFieldLabel(key)}
              </th>
              <td className="py-2.5 align-top text-foreground">
                {formatSaferFieldValue(value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CsaBasicsTable({
  rows,
}: {
  rows: {
    name: string;
    measure: string;
    percentile: string;
    violations: string;
    threshold: string;
    runDate: string;
  }[];
}) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No CSA BASIC scores returned for this carrier.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[32rem] text-sm">
        <thead className="bg-muted/50 text-left">
          <tr>
            <th className="px-3 py-2 font-medium">BASIC</th>
            <th className="px-3 py-2 font-medium">Measure</th>
            <th className="px-3 py-2 font-medium">Percentile</th>
            <th className="px-3 py-2 font-medium">Violations</th>
            <th className="px-3 py-2 font-medium">Threshold</th>
            <th className="px-3 py-2 font-medium">As of</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name} className="border-t border-border">
              <td className="px-3 py-2 font-medium">{row.name}</td>
              <td className="px-3 py-2">{row.measure}</td>
              <td className="px-3 py-2">{row.percentile}</td>
              <td className="px-3 py-2">{row.violations}</td>
              <td className="px-3 py-2">{row.threshold}</td>
              <td className="px-3 py-2 text-muted-foreground">{row.runDate}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
