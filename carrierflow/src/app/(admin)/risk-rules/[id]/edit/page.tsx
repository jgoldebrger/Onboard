import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdminPage } from "../../../_lib";
import { DeleteButton } from "../../../_components/delete-button";
import { RiskRuleForm } from "../../risk-rule-form";

type Params = { params: Promise<{ id: string }> };

export default async function EditRiskRulePage({ params }: Params) {
  await requireAdminPage("config:manage");
  const { id } = await params;

  const riskRule = await db.riskRule.findUnique({ where: { id } });
  if (!riskRule) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Edit risk rule</h1>
      <RiskRuleForm
        initial={{
          id: riskRule.id,
          key: riskRule.key,
          label: riskRule.label,
          points: riskRule.points,
          conditionJson: JSON.stringify(riskRule.condition, null, 2),
          isEnabled: riskRule.isEnabled,
        }}
      />
      <DeleteButton
        apiPath={`/api/admin/risk-rules/${id}`}
        redirectTo="/risk-rules"
      />
    </div>
  );
}
