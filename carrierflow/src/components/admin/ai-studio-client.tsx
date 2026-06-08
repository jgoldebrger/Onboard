"use client";

import { useCallback, useEffect, useState } from "react";

type AgentRow = {
  id: string;
  key: string;
  name: string;
  isActive: boolean;
  published?: {
    id: string;
    version: number;
    model: string;
    systemPrompt: string;
    temperature: number;
    maxTokens: number;
    visionEnabled: boolean;
  };
  versions: {
    id: string;
    version: number;
    isPublished: boolean;
    model: string;
    systemPrompt: string;
    temperature: number;
    maxTokens: number;
    visionEnabled: boolean;
  }[];
};

type RunLog = {
  id: string;
  latencyMs: number | null;
  confidence: number | null;
  success: boolean;
  createdAt: string;
};

export function AiStudioClient({ initialAgents }: { initialAgents: AgentRow[] }) {
  const [agents, setAgents] = useState(initialAgents);
  const [selectedId, setSelectedId] = useState(initialAgents[0]?.id ?? "");
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("gpt-4o");
  const [temperature, setTemperature] = useState(0.2);
  const [maxTokens, setMaxTokens] = useState(4096);
  const [visionEnabled, setVisionEnabled] = useState(false);
  const [runs, setRuns] = useState<RunLog[]>([]);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const selected = agents.find((a) => a.id === selectedId);

  const loadRuns = useCallback(async (configId: string) => {
    const res = await fetch(`/api/admin/ai-studio/${configId}/runs`);
    if (res.ok) {
      const data = await res.json();
      setRuns(data.runs);
    }
  }, []);

  useEffect(() => {
    if (!selected) return;
    const pub = selected.published ?? selected.versions[0];
    if (pub) {
      setPrompt(pub.systemPrompt);
      setModel(pub.model);
      setTemperature(pub.temperature);
      setMaxTokens(pub.maxTokens);
      setVisionEnabled(pub.visionEnabled);
    }
    loadRuns(selected.id);
  }, [selected, loadRuns]);

  async function saveDraft() {
    if (!selected) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/ai-studio/${selected.id}/prompts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt: prompt,
          model,
          temperature,
          maxTokens,
          visionEnabled,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const created = await res.json();
      await fetch(`/api/admin/ai-studio/prompts/${created.id}/publish`, {
        method: "POST",
      });
      const list = await fetch("/api/admin/ai-studio");
      const data = await list.json();
      setAgents(data.agents);
      setTestResult("Draft saved and published.");
    } catch (e) {
      setTestResult(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function runTest() {
    if (!selected) return;
    setBusy(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/admin/ai-studio/${selected.id}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sampleMessage: "Summarize your role in one sentence." }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Test failed");
      setTestResult(
        `${data.message ?? data.preview}\n(model: ${data.model}, ${data.latencyMs}ms)`,
      );
    } catch (e) {
      setTestResult(e instanceof Error ? e.message : "Test failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <aside className="space-y-1">
        {agents.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setSelectedId(a.id)}
            className={`block w-full rounded px-3 py-2 text-left text-sm ${
              a.id === selectedId ? "bg-neutral-900 text-white" : "hover:bg-neutral-100"
            }`}
          >
            {a.name}
            {a.published ? (
              <span className="block text-xs opacity-70">v{a.published.version} live</span>
            ) : null}
          </button>
        ))}
      </aside>

      {selected ? (
        <div className="space-y-4">
          <h2 className="text-lg font-medium">{selected.name}</h2>
          <label className="block text-sm">
            System prompt
            <textarea
              className="mt-1 w-full rounded border p-2 font-mono text-xs"
              rows={12}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-sm">
              Model
              <input
                className="mt-1 w-full rounded border px-2 py-1"
                value={model}
                onChange={(e) => setModel(e.target.value)}
              />
            </label>
            <label className="text-sm">
              Temperature
              <input
                type="number"
                step="0.1"
                className="mt-1 w-full rounded border px-2 py-1"
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
              />
            </label>
            <label className="text-sm">
              Max tokens
              <input
                type="number"
                className="mt-1 w-full rounded border px-2 py-1"
                value={maxTokens}
                onChange={(e) => setMaxTokens(Number(e.target.value))}
              />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={visionEnabled}
              onChange={(e) => setVisionEnabled(e.target.checked)}
            />
            Vision enabled
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={saveDraft}
              className="rounded bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              Save & publish
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={runTest}
              className="rounded border px-4 py-2 text-sm disabled:opacity-50"
            >
              Test sandbox
            </button>
          </div>
          {testResult ? (
            <pre className="whitespace-pre-wrap rounded border bg-neutral-50 p-3 text-xs">
              {testResult}
            </pre>
          ) : null}
          <section>
            <h3 className="text-sm font-medium">Recent runs</h3>
            <ul className="mt-2 divide-y rounded border text-xs">
              {runs.length === 0 ? (
                <li className="p-3 text-neutral-500">No runs logged yet.</li>
              ) : (
                runs.map((r) => (
                  <li key={r.id} className="flex justify-between px-3 py-2">
                    <span>{r.success ? "OK" : "ERR"}</span>
                    <span>{r.latencyMs ?? "—"}ms</span>
                    <span>{new Date(r.createdAt).toLocaleString()}</span>
                  </li>
                ))
              )}
            </ul>
          </section>
        </div>
      ) : null}
    </div>
  );
}
