import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdminPage } from "../_lib";
import {
  RiskRulesTable,
  type RiskRuleRow,
} from "../_components/tables/risk-rules-table";

export default async function RiskRulesPage() {
  await requireAdminPage("config:manage");

  const riskRules = await db.riskRule.findMany({
    orderBy: { key: "asc" },
  });

  const rows: RiskRuleRow[] = riskRules.map((rule) => ({
    id: rule.id,
    key: rule.key,
    label: rule.label,
    points: rule.points,
    isEnabled: rule.isEnabled,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Risk rules</h1>
        <Link
          href="/risk-rules/new"
          className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90"
        >
          New risk rule
        </Link>
      </div>

      <RiskRulesTable data={rows} />
    </div>
  );
}
