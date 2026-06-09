"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SimResult = {
  requiredQuestions: { id: string; key: string; name: string }[];
  requiredDocuments: { id: string; key: string; name: string }[];
  blocked: boolean;
  blockReasons: string[];
  riskAdditions: { ruleId: string; points: number; label: string }[];
};

export function RulesSimulator({
  carrierTypeSlugs,
}: {
  carrierTypeSlugs: string[];
}) {
  const [slug, setSlug] = useState(carrierTypeSlugs[0] ?? "");
  const [answersJson, setAnswersJson] = useState("{}");
  const [result, setResult] = useState<SimResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function runSimulation(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      let answers: Record<string, unknown> = {};
      if (answersJson.trim()) {
        answers = JSON.parse(answersJson) as Record<string, unknown>;
      }
      const res = await fetch("/api/admin/rules/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ carrierTypeSlug: slug, answers }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Simulation failed");
      setResult(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Simulation failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-10 rounded-lg border border-border bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold">Rules preview simulator</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Enter a carrier type and optional answer values (question keys) to see
        which documents and questions the published rules engine requires.
      </p>

      <form onSubmit={runSimulation} className="mt-4 space-y-4">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Carrier type slug</span>
          {carrierTypeSlugs.length > 0 ? (
            <select
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {carrierTypeSlugs.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          ) : (
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g. broker"
            />
          )}
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium">
            Answers JSON (optional)
          </span>
          <textarea
            value={answersJson}
            onChange={(e) => setAnswersJson(e.target.value)}
            rows={4}
            className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
            placeholder='{"hazmat": "yes"}'
          />
        </label>

        <Button type="submit" disabled={busy || !slug.trim()}>
          {busy ? "Running…" : "Simulate requirements"}
        </Button>
      </form>

      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}

      {result ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold">Required questions</h3>
            {result.requiredQuestions.length === 0 ? (
              <p className="text-sm text-muted-foreground">None</p>
            ) : (
              <ul className="mt-2 divide-y rounded-md border text-sm">
                {result.requiredQuestions.map((q) => (
                  <li key={q.id} className="px-3 py-2">
                    {q.name}
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({q.key})
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold">Required documents</h3>
            {result.requiredDocuments.length === 0 ? (
              <p className="text-sm text-muted-foreground">None</p>
            ) : (
              <ul className="mt-2 divide-y rounded-md border text-sm">
                {result.requiredDocuments.map((d) => (
                  <li key={d.id} className="px-3 py-2">
                    {d.name}
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({d.key})
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {result.blocked ? (
            <div className="sm:col-span-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-950">
              <strong>Approval blocked:</strong>{" "}
              {result.blockReasons.join("; ")}
            </div>
          ) : null}
          {result.riskAdditions.length > 0 ? (
            <div className="sm:col-span-2 text-sm text-muted-foreground">
              Risk additions:{" "}
              {result.riskAdditions
                .map((r) => `${r.label} (+${r.points})`)
                .join(", ")}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
