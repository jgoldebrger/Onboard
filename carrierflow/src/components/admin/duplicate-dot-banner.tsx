import Link from "next/link";
import type { DuplicateCheckResult } from "@/lib/fraud/duplicate-dot";

export function DuplicateDotBanner({
  duplicates,
}: {
  duplicates: DuplicateCheckResult;
}) {
  if (
    !duplicates.duplicateDot &&
    !duplicates.duplicateMc &&
    !duplicates.duplicateEmail
  ) {
    return null;
  }

  return (
    <section className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950">
      <h2 className="font-semibold">Duplicate carrier warning</h2>
      <ul className="mt-1 list-disc pl-5">
        {duplicates.details.map((d) => (
          <li key={d}>{d}</li>
        ))}
      </ul>
      {duplicates.conflictingApplications.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {duplicates.conflictingApplications.map((app) => (
            <li key={app.id}>
              <Link
                href={`/carriers/${app.id}`}
                className="font-medium underline hover:no-underline"
              >
                {app.companyName ?? app.email}
              </Link>
              <span className="text-red-800/80"> · {app.status}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
