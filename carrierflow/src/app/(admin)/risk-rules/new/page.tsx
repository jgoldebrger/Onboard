import { requireAdminPage } from "../../_lib";
import { RiskRuleForm } from "../risk-rule-form";

export default async function NewRiskRulePage() {
  await requireAdminPage("config:manage");

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">New risk rule</h1>
      <RiskRuleForm />
    </div>
  );
}
