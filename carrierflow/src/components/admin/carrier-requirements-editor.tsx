"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type QuestionRow = {
  id: string;
  key: string;
  label: string;
  type: string;
};

type DocumentRow = {
  id: string;
  key: string;
  name: string;
  description: string | null;
};

type Props = {
  carrierType: { id: string; slug: string; name: string };
  questions: QuestionRow[];
  documentTypes: DocumentRow[];
  initialQuestionIds: string[];
  initialDocumentTypeIds: string[];
  effectiveQuestionIds: string[];
  effectiveDocumentTypeIds: string[];
};

export function CarrierRequirementsEditor({
  carrierType,
  questions,
  documentTypes,
  initialQuestionIds,
  initialDocumentTypeIds,
  effectiveQuestionIds,
  effectiveDocumentTypeIds,
}: Props) {
  const router = useRouter();
  const [questionIds, setQuestionIds] = useState(
    () => new Set(initialQuestionIds),
  );
  const [documentTypeIds, setDocumentTypeIds] = useState(
    () => new Set(initialDocumentTypeIds),
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const hasExtraEffective = useMemo(() => {
    const qExtra = effectiveQuestionIds.some((id) => !questionIds.has(id));
    const dExtra = effectiveDocumentTypeIds.some(
      (id) => !documentTypeIds.has(id),
    );
    return qExtra || dExtra;
  }, [
    effectiveQuestionIds,
    effectiveDocumentTypeIds,
    questionIds,
    documentTypeIds,
  ]);

  function toggle(set: Set<string>, id: string, checked: boolean) {
    const next = new Set(set);
    if (checked) next.add(id);
    else next.delete(id);
    return next;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/carrier-types/${carrierType.id}/requirements`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questionIds: [...questionIds],
            documentTypeIds: [...documentTypeIds],
          }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      if (questionIds.size === 0 && documentTypeIds.size === 0) {
        setSuccess(`Requirements cleared for ${carrierType.name}.`);
      } else {
        setSuccess(
          `Requirements published (version ${data.version ?? "—"}). Carriers who select “${carrierType.name}” will see these in onboarding.`,
        );
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Requirements — {carrierType.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose which questions and documents are <strong>required</strong> when
          a carrier selects type{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            {carrierType.slug}
          </code>
          . The interview agent enforces these after the carrier picks their type.
        </p>
      </div>

      {hasExtraEffective ? (
        <Alert variant="warning">
          <AlertDescription>
            Other published rules on the{" "}
            <a href="/rules" className="font-medium underline">
              Rules
            </a>{" "}
            page also add requirements for this carrier type. Saving here updates
            the managed rule <code className="text-xs">requirements/{carrierType.slug}</code> only.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Required questions</CardTitle>
            <CardDescription>
              Shown in the interview checklist and asked by the Interview Agent.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {questions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No questions yet. Add them under{" "}
                <a href="/questions" className="underline">
                  Questions
                </a>
                .
              </p>
            ) : (
              questions.map((q) => (
                <label
                  key={q.id}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 hover:bg-muted/40"
                >
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={questionIds.has(q.id)}
                    onChange={(e) =>
                      setQuestionIds(toggle(questionIds, q.id, e.target.checked))
                    }
                  />
                  <span>
                    <span className="block text-sm font-medium">{q.label}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {q.key} · {q.type}
                    </span>
                  </span>
                </label>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Required documents</CardTitle>
            <CardDescription>
              Carriers must upload these on the Documents step.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {documentTypes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No document types yet. Add them under{" "}
                <a href="/documents" className="underline">
                  Documents
                </a>
                .
              </p>
            ) : (
              documentTypes.map((d) => (
                <label
                  key={d.id}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 hover:bg-muted/40"
                >
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={documentTypeIds.has(d.id)}
                    onChange={(e) =>
                      setDocumentTypeIds(
                        toggle(documentTypeIds, d.id, e.target.checked),
                      )
                    }
                  />
                  <span>
                    <span className="block text-sm font-medium">{d.name}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {d.key}
                    </span>
                    {d.description ? (
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {d.description}
                      </span>
                    ) : null}
                  </span>
                </label>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {success ? (
        <Alert variant="success">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={busy}>
          {busy ? "Publishing…" : "Save & publish requirements"}
        </Button>
        <Button type="button" variant="outline" asChild>
          <a href="/carrier-types">Back to carrier types</a>
        </Button>
      </div>
    </form>
  );
}
