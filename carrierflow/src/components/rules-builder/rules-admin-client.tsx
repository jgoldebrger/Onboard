"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ConditionTreeEditor,
  defaultGroup,
} from "@/components/rules-builder/condition-tree-editor";
import type { ConditionNode } from "@/types/domain";

export type AdminRuleRow = {
  id: string;
  priority: number;
  isEnabled: boolean;
  ruleVersion: {
    id: string;
    name: string;
    description: string | null;
    version: number;
    isPublished: boolean;
    publishedAt: string | null;
    conditions: unknown;
    actions: unknown;
    createdAt: string;
  };
};

const DEFAULT_CONDITIONS = {
  type: "group",
  op: "AND",
  children: [
    {
      type: "clause",
      field: "carrier_type",
      operator: "eq",
      value: "broker",
    },
  ],
};

const DEFAULT_ACTIONS = [
  {
    effect: "REQUIRE",
    targetType: "document",
    targetId: "",
    params: {},
  },
];

type Props = {
  initialRules: AdminRuleRow[];
  canPublish: boolean;
};

export function RulesAdminClient({ initialRules, canPublish }: Props) {
  const router = useRouter();
  const [rules, setRules] = useState(initialRules);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("100");
  const [conditionsJson, setConditionsJson] = useState(
    JSON.stringify(DEFAULT_CONDITIONS, null, 2),
  );
  const [actionsJson, setActionsJson] = useState(
    JSON.stringify(DEFAULT_ACTIONS, null, 2),
  );
  const [conditionMode, setConditionMode] = useState<"visual" | "json">(
    "visual",
  );
  const [conditionTree, setConditionTree] =
    useState<ConditionNode>(defaultGroup());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refreshRules() {
    const res = await fetch("/api/admin/rules");
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? "Failed to load rules");
    }
    const data = await res.json();
    setRules(data.rules);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      let conditions: unknown;
      let actions: unknown;
      try {
        conditions =
          conditionMode === "visual"
            ? conditionTree
            : JSON.parse(conditionsJson);
        actions = JSON.parse(actionsJson);
      } catch {
        throw new Error("Conditions and actions must be valid JSON");
      }

      const res = await fetch("/api/admin/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || undefined,
          priority: Number(priority),
          conditions,
          actions,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to create rule");
      }

      setName("");
      setDescription("");
      await refreshRules();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function handlePublish(ruleVersionId: string) {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/rules/${ruleVersionId}/publish`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to publish");
      }
      await refreshRules();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleToggle(ruleId: string) {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/rules/${ruleId}/toggle`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to toggle rule");
      }
      await refreshRules();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Toggle failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Rules</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Manage onboarding requirement rules. Draft versions can be published
          when ready.
        </p>
      </header>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <section className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-medium">Create draft rule</h2>
        <form onSubmit={handleCreate} className="mt-4 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Name</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded border border-neutral-300 px-3 py-2"
              placeholder="Broker requires COI"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Description</span>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded border border-neutral-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Priority (lower runs first)</span>
            <input
              type="number"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-32 rounded border border-neutral-300 px-3 py-2"
            />
          </label>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex items-center gap-3">
              <span className="font-medium">Conditions</span>
              <button
                type="button"
                className={`text-xs underline ${conditionMode === "visual" ? "font-semibold" : ""}`}
                onClick={() => {
                  setConditionMode("visual");
                  try {
                    setConditionTree(JSON.parse(conditionsJson) as ConditionNode);
                  } catch {
                    setConditionTree(defaultGroup());
                  }
                }}
              >
                Visual tree
              </button>
              <button
                type="button"
                className={`text-xs underline ${conditionMode === "json" ? "font-semibold" : ""}`}
                onClick={() => {
                  setConditionsJson(JSON.stringify(conditionTree, null, 2));
                  setConditionMode("json");
                }}
              >
                JSON
              </button>
            </div>
            {conditionMode === "visual" ? (
              <ConditionTreeEditor
                value={conditionTree}
                onChange={setConditionTree}
              />
            ) : (
              <textarea
                value={conditionsJson}
                onChange={(e) => setConditionsJson(e.target.value)}
                rows={8}
                className="font-mono rounded border border-neutral-300 px-3 py-2 text-xs"
              />
            )}
          </div>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Actions (JSON array)</span>
            <textarea
              value={actionsJson}
              onChange={(e) => setActionsJson(e.target.value)}
              rows={8}
              className="font-mono rounded border border-neutral-300 px-3 py-2 text-xs"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="w-fit rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Create draft
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-medium">All rules</h2>
        {rules.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-600">No rules yet.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-4">
            {rules.map((rule) => (
              <li
                key={rule.id}
                className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {rule.ruleVersion.name}{" "}
                      <span className="text-neutral-500">
                        v{rule.ruleVersion.version}
                      </span>
                    </p>
                    {rule.ruleVersion.description ? (
                      <p className="mt-1 text-sm text-neutral-600">
                        {rule.ruleVersion.description}
                      </p>
                    ) : null}
                    <p className="mt-2 text-xs text-neutral-500">
                      Rule ID: {rule.id} · Version ID: {rule.ruleVersion.id} ·
                      Priority: {rule.priority}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        rule.isEnabled
                          ? "bg-green-100 text-green-800"
                          : "bg-neutral-100 text-neutral-600"
                      }`}
                    >
                      {rule.isEnabled ? "Enabled" : "Disabled"}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        rule.ruleVersion.isPublished
                          ? "bg-blue-100 text-blue-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {rule.ruleVersion.isPublished ? "Published" : "Draft"}
                    </span>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleToggle(rule.id)}
                    className="rounded border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50 disabled:opacity-50"
                  >
                    {rule.isEnabled ? "Disable" : "Enable"}
                  </button>
                  {canPublish && !rule.ruleVersion.isPublished ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handlePublish(rule.ruleVersion.id)}
                      className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      Publish version
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
