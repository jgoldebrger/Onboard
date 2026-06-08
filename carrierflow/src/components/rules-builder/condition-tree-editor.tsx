"use client";

import type { ConditionNode } from "@/types/domain";

const OPERATORS = ["eq", "neq", "gt", "contains", "in"] as const;
const FIELDS = [
  "carrier_type",
  "answer.company_legal_name",
  "answer.dot_number",
  "answer.mc_number",
  "answer.has_lift_gate",
] as const;

function defaultClause(): Extract<ConditionNode, { type: "clause" }> {
  return {
    type: "clause",
    field: "carrier_type",
    operator: "eq",
    value: "broker",
  };
}

function defaultGroup(): Extract<ConditionNode, { type: "group" }> {
  return { type: "group", op: "AND", children: [defaultClause()] };
}

type Props = {
  value: ConditionNode;
  onChange: (node: ConditionNode) => void;
};

export function ConditionTreeEditor({ value, onChange }: Props) {
  if (value.type === "clause") {
    return (
      <ClauseEditor
        clause={value}
        onChange={(c) => onChange(c)}
        onRemove={() => onChange(defaultGroup())}
      />
    );
  }

  return (
    <div className="rounded border border-neutral-200 p-3 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-neutral-500">Group</span>
        <select
          className="rounded border px-2 py-1 text-sm"
          value={value.op}
          onChange={(e) =>
            onChange({
              ...value,
              op: e.target.value as "AND" | "OR",
            })
          }
        >
          <option value="AND">AND</option>
          <option value="OR">OR</option>
        </select>
        <button
          type="button"
          className="text-xs underline"
          onClick={() =>
            onChange({
              ...value,
              children: [...value.children, defaultClause()],
            })
          }
        >
          + clause
        </button>
        <button
          type="button"
          className="text-xs underline"
          onClick={() =>
            onChange({
              ...value,
              children: [
                ...value.children,
                { type: "group", op: "AND", children: [defaultClause()] },
              ],
            })
          }
        >
          + nested group
        </button>
      </div>
      <div className="ml-4 space-y-2 border-l-2 border-neutral-100 pl-3">
        {value.children.map((child, i) => (
          <div key={i} className="relative">
            <ConditionTreeEditor
              value={child}
              onChange={(updated) => {
                const children = [...value.children];
                children[i] = updated;
                onChange({ ...value, children });
              }}
            />
            <button
              type="button"
              className="absolute -right-1 top-0 text-xs text-red-600"
              onClick={() => {
                const children = value.children.filter((_, j) => j !== i);
                onChange({
                  ...value,
                  children: children.length ? children : [defaultClause()],
                });
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClauseEditor({
  clause,
  onChange,
  onRemove,
}: {
  clause: Extract<ConditionNode, { type: "clause" }>;
  onChange: (c: Extract<ConditionNode, { type: "clause" }>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex flex-wrap items-end gap-2 rounded bg-neutral-50 p-2 text-sm">
      <label>
        Field
        <select
          className="ml-1 rounded border px-2 py-1"
          value={clause.field}
          onChange={(e) => onChange({ ...clause, field: e.target.value })}
        >
          {FIELDS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </label>
      <label>
        Op
        <select
          className="ml-1 rounded border px-2 py-1"
          value={clause.operator}
          onChange={(e) => onChange({ ...clause, operator: e.target.value })}
        >
          {OPERATORS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </label>
      <label className="flex-1 min-w-[120px]">
        Value
        <input
          className="ml-1 w-full rounded border px-2 py-1"
          value={String(clause.value ?? "")}
          onChange={(e) => {
            let val: unknown = e.target.value;
            if (clause.operator === "in") {
              val = e.target.value.split(",").map((s) => s.trim());
            } else if (e.target.value === "true" || e.target.value === "false") {
              val = e.target.value === "true";
            }
            onChange({ ...clause, value: val });
          }}
        />
      </label>
      <button type="button" className="text-xs text-red-600" onClick={onRemove}>
        Remove
      </button>
    </div>
  );
}

export function parseConditionNode(json: string): ConditionNode {
  const parsed = JSON.parse(json) as ConditionNode;
  if (parsed.type !== "group" && parsed.type !== "clause") {
    throw new Error("Invalid condition root");
  }
  return parsed;
}

export { defaultGroup };
