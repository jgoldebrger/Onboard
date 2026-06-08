import { redirect } from "next/navigation";
import {
  AuthError,
  getSessionUser,
  hasPermission,
  requirePermission,
} from "@/lib/auth";
import { db } from "@/lib/db";
import {
  RulesAdminClient,
  type AdminRuleRow,
} from "@/components/rules-builder/rules-admin-client";

export default async function AdminRulesPage() {
  try {
    await requirePermission("config:manage");
  } catch (error) {
    if (error instanceof AuthError && error.status === 401) {
      redirect("/sign-in");
    }
    return (
      <main className="px-6 py-10">
        <p className="text-sm text-red-700">
          You do not have permission to manage rules.
        </p>
      </main>
    );
  }

  const user = await getSessionUser();
  const canPublish = user ? hasPermission(user.role, "rules:publish") : false;

  const rules = await db.rule.findMany({
    include: { ruleVersion: true },
    orderBy: [{ ruleVersion: { createdAt: "desc" } }, { priority: "asc" }],
  });

  const initialRules: AdminRuleRow[] = rules.map((rule) => ({
    id: rule.id,
    priority: rule.priority,
    isEnabled: rule.isEnabled,
    ruleVersion: {
      id: rule.ruleVersion.id,
      name: rule.ruleVersion.name,
      description: rule.ruleVersion.description,
      version: rule.ruleVersion.version,
      isPublished: rule.ruleVersion.isPublished,
      publishedAt: rule.ruleVersion.publishedAt?.toISOString() ?? null,
      conditions: rule.ruleVersion.conditions,
      actions: rule.ruleVersion.actions,
      createdAt: rule.ruleVersion.createdAt.toISOString(),
    },
  }));

  return (
    <main className="min-h-full bg-neutral-50">
      <RulesAdminClient initialRules={initialRules} canPublish={canPublish} />
    </main>
  );
}
