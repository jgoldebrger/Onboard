"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChatDocumentUpload,
  ChatIdentityUpload,
} from "@/components/carrier/chat-inline-uploads";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge, statusBadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { buildDocumentReviewDonePrompt } from "@/lib/interview/onboarding-state";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type OnboardingPhase =
  | "carrier_type"
  | "questions"
  | "documents"
  | "identity"
  | "complete";

type NextPrompt = {
  kind: string;
  prompt: string;
  key?: string;
  label?: string;
  documentTypeId?: string;
  name?: string;
  awaitingReview?: boolean;
};

type ProcessingDocument = {
  documentId: string;
  documentTypeId: string;
  name: string;
  reviewProgress: number;
  reviewStep: string | null;
};

type DocumentTypeItem = {
  id: string;
  key: string;
  name: string;
  uploaded: boolean;
  reviewStatus: string | null;
};

type QuestionsResponse = {
  phase: OnboardingPhase;
  nextPrompt: NextPrompt | null;
  documentTypes: DocumentTypeItem[];
  processingDocument: ProcessingDocument | null;
  nextQuestion: { key: string; label: string; prompt: string } | null;
  carrierTypeSlug: string | null;
  progress: {
    questionsTotal: number;
    questionsAnswered: number;
    documentsTotal: number;
    documentsUploaded: number;
    identityComplete: boolean;
  };
  requirements: { blocked: boolean; blockReasons: string[] };
};

type AgentResponse = {
  message: string;
  phase?: OnboardingPhase;
  nextPrompt?: NextPrompt | null;
  nextQuestion?: { key: string; label: string; prompt: string } | null;
  detectedCarrierType?: string;
  savedAnswerKeys?: string[];
  fmcsaLookupStarted?: boolean;
  fmcsaCrossReference?: unknown;
};

function promptKey(p: NextPrompt | null): string | null {
  if (!p) return null;
  if (p.kind === "question" && p.key) return `question:${p.key}`;
  if (p.kind === "document" && p.key) return `document:${p.key}`;
  if (p.kind === "identity") return "identity";
  if (p.kind === "carrier_type") return "carrier_type";
  if (p.kind === "complete") return "complete";
  return p.kind;
}

const WELCOME_INTRO =
  "Welcome to CarrierFlow. We'll start with your DOT number and verify it against the FMCSA registry (SAFER), then carrier type, remaining questions, documents, and identity verification.";

function formatAssistantPrompt(
  prompt: string,
  nextPrompt: NextPrompt,
  isFirstAssistant: boolean,
): string {
  if (
    isFirstAssistant &&
    nextPrompt.kind === "question" &&
    nextPrompt.key === "dot_number"
  ) {
    return `${WELCOME_INTRO}\n\n${prompt}`;
  }
  return prompt;
}

export function InterviewChat({
  applicationId,
  initialStatus,
}: {
  applicationId: string;
  initialStatus: string;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<OnboardingPhase>("carrier_type");
  const [nextPrompt, setNextPrompt] = useState<NextPrompt | null>(null);
  const [nextQuestion, setNextQuestion] = useState<{
    key: string;
    label: string;
  } | null>(null);
  const [, setDocumentTypes] = useState<DocumentTypeItem[]>([]);
  const [processingDocument, setProcessingDocument] =
    useState<ProcessingDocument | null>(null);
  const [progress, setProgress] = useState({
    questionsTotal: 0,
    questionsAnswered: 0,
    documentsTotal: 0,
    documentsUploaded: 0,
    identityComplete: false,
  });
  const [blockReasons, setBlockReasons] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const lastPromptedKeyRef = useRef<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [polling, setPolling] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const appendAssistant = useCallback(
    (content: string, idPrefix = "assistant", nextPromptForWelcome?: NextPrompt) => {
      setMessages((prev) => {
        const isFirstAssistant = !prev.some((m) => m.role === "assistant");
        const text =
          nextPromptForWelcome && isFirstAssistant
            ? formatAssistantPrompt(content, nextPromptForWelcome, true)
            : content;
        if (prev.some((m) => m.role === "assistant" && m.content === text)) {
          return prev;
        }
        return [
          ...prev,
          { id: `${idPrefix}-${Date.now()}`, role: "assistant", content: text },
        ];
      });
    },
    [],
  );

  const applyState = useCallback((json: QuestionsResponse) => {
    setPhase(json.phase);
    setNextPrompt(json.nextPrompt);
    setDocumentTypes(json.documentTypes);
    setProcessingDocument(json.processingDocument);
    setProgress(json.progress);
    setBlockReasons(json.requirements.blockReasons);
    if (json.nextQuestion) {
      setNextQuestion({
        key: json.nextQuestion.key,
        label: json.nextQuestion.label,
      });
    } else {
      setNextQuestion(null);
    }
  }, []);

  const loadQuestions = useCallback(async () => {
    const res = await fetch(`/api/interview/${applicationId}/questions`);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error ?? "Failed to load questions");
    }
    const json = (await res.json()) as QuestionsResponse;
    applyState(json);
    return json;
  }, [applicationId, applyState]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadQuestions();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      } finally {
        if (!cancelled) setPolling(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadQuestions]);

  useEffect(() => {
    if (polling || !nextPrompt?.prompt) return;
    const key = promptKey(nextPrompt);
    if (!key || lastPromptedKeyRef.current === key) return;
    lastPromptedKeyRef.current = key;
    appendAssistant(nextPrompt.prompt, `ask-${key}`, nextPrompt);
  }, [polling, nextPrompt, appendAssistant]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending, phase]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: "user", content: text },
    ]);
    setInput("");
    setSending(true);
    setError(null);

    try {
      const res = await fetch(`/api/interview/${applicationId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          questionKey: nextQuestion?.key,
        }),
      });
      const raw = await res.text();
      let json = {} as AgentResponse & { error?: string };
      if (raw) {
        try {
          json = JSON.parse(raw) as AgentResponse & { error?: string };
        } catch {
          throw new Error("Server returned an invalid response. Please try again.");
        }
      } else if (!res.ok) {
        throw new Error(`Request failed (${res.status}). Please try again.`);
      }
      if (!res.ok) throw new Error(json.error ?? "Message failed");

      appendAssistant(json.message);
      if (json.detectedCarrierType) setStatus("IN_PROGRESS");
      if (json.phase) setPhase(json.phase);
      if (json.nextPrompt) {
        setNextPrompt(json.nextPrompt);
        lastPromptedKeyRef.current = promptKey(json.nextPrompt);
      }
      if (json.nextQuestion) {
        setNextQuestion({
          key: json.nextQuestion.key,
          label: json.nextQuestion.label,
        });
      }

      setSending(false);

      const refreshed = await loadQuestions();
      if (refreshed?.nextPrompt) {
        lastPromptedKeyRef.current = promptKey(refreshed.nextPrompt);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
      setSending(false);
    }
  }

  async function afterDocumentReview(documentName: string, status: string) {
    appendAssistant(
      buildDocumentReviewDonePrompt(documentName, status),
      "review-done",
    );
    const refreshed = await loadQuestions();
    if (
      refreshed?.nextPrompt?.prompt &&
      !refreshed.nextPrompt.awaitingReview
    ) {
      lastPromptedKeyRef.current = promptKey(refreshed.nextPrompt);
      appendAssistant(refreshed.nextPrompt.prompt, "ask-next");
    }
  }

  async function afterIdentityUpload() {
    setMessages((prev) => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        role: "user",
        content: "Submitted identity verification",
      },
    ]);
    const refreshed = await loadQuestions();
    if (refreshed?.nextPrompt?.prompt) {
      lastPromptedKeyRef.current = promptKey(refreshed.nextPrompt);
      appendAssistant(refreshed.nextPrompt.prompt, "ask-next");
    }
  }

  const showTextInput =
    phase === "carrier_type" || phase === "questions";
  const documentPrompt =
    nextPrompt?.kind === "document" ? nextPrompt : null;

  let progressSteps = 1;
  let progressDone = progress.identityComplete ? 1 : 0;
  if (progress.questionsTotal > 0) {
    progressSteps++;
    if (progress.questionsAnswered >= progress.questionsTotal) {
      progressDone++;
    }
  }
  if (progress.documentsTotal > 0) {
    progressSteps++;
    if (progress.documentsUploaded >= progress.documentsTotal) {
      progressDone++;
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Onboarding</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Complete everything here — questions, documents, and identity check.
          </p>
        </div>
        <Badge variant={statusBadgeVariant(status)}>
          {status.replace(/_/g, " ")}
        </Badge>
      </div>

      {!polling ? (
        <Card className="border-accent/50 bg-accent/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Progress</CardTitle>
            <CardDescription>
              {progressDone} of {progressSteps || 1} sections complete
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div
              className="h-2 overflow-hidden rounded-full bg-muted"
              role="progressbar"
            >
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{
                  width: `${Math.round((progressDone / (progressSteps || 1)) * 100)}%`,
                }}
              />
            </div>
            {progress.questionsTotal > 0 ? (
              <p>
                Questions: {progress.questionsAnswered} /{" "}
                {progress.questionsTotal}
              </p>
            ) : null}
            {progress.documentsTotal > 0 ? (
              <p>
                Documents: {progress.documentsUploaded} /{" "}
                {progress.documentsTotal}
              </p>
            ) : null}
            <p>
              Identity: {progress.identityComplete ? "Submitted" : "Pending"}
            </p>
            {blockReasons.length > 0 ? (
              <Alert variant="warning">
                <AlertTitle>Action needed</AlertTitle>
                <AlertDescription>{blockReasons.join(" · ")}</AlertDescription>
              </Alert>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card className="overflow-hidden shadow-sm">
        <CardContent className="p-0">
          <div
            className="flex max-h-[min(480px,60vh)] min-h-[320px] flex-col"
            aria-live="polite"
          >
            <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "flex",
                    m.role === "user" ? "justify-end" : "justify-start",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm",
                      m.role === "user"
                        ? "rounded-br-md bg-primary text-primary-foreground"
                        : "rounded-bl-md border border-border bg-muted text-foreground",
                    )}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {sending ? (
                <p className="text-sm text-muted-foreground">Saving…</p>
              ) : null}
              <div ref={bottomRef} />
            </div>

            <div className="border-t border-border bg-card p-3 sm:p-4 space-y-3">
              {phase === "documents" && documentPrompt?.documentTypeId ? (
                <ChatDocumentUpload
                  applicationId={applicationId}
                  documentTypeId={documentPrompt.documentTypeId}
                  documentName={documentPrompt.name ?? "document"}
                  awaitingReview={Boolean(documentPrompt.awaitingReview)}
                  processingDocumentId={
                    processingDocument?.documentTypeId ===
                    documentPrompt.documentTypeId
                      ? processingDocument.documentId
                      : null
                  }
                  initialProgress={
                    processingDocument?.documentTypeId ===
                    documentPrompt.documentTypeId
                      ? processingDocument.reviewProgress
                      : 0
                  }
                  initialStep={
                    processingDocument?.documentTypeId ===
                    documentPrompt.documentTypeId
                      ? processingDocument.reviewStep
                      : null
                  }
                  onUploadStarted={() => {
                    setMessages((prev) => [
                      ...prev,
                      {
                        id: `user-${Date.now()}`,
                        role: "user",
                        content: `Uploaded ${documentPrompt.name ?? "document"}`,
                      },
                    ]);
                  }}
                  onReviewComplete={({ documentName, status }) => {
                    void afterDocumentReview(documentName, status);
                  }}
                />
              ) : null}

              {phase === "identity" ? (
                <ChatIdentityUpload
                  applicationId={applicationId}
                  onUploaded={() => {
                    void afterIdentityUpload();
                  }}
                />
              ) : null}

              {showTextInput ? (
                <form onSubmit={sendMessage} className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={
                      nextQuestion
                        ? `Your answer: ${nextQuestion.label}…`
                        : "Tell me your carrier type (e.g. broker, long-haul)…"
                    }
                    disabled={sending || status === "PENDING_REVIEW"}
                    className="flex-1"
                    aria-label="Message"
                  />
                  <Button
                    type="submit"
                    disabled={
                      sending || !input.trim() || status === "PENDING_REVIEW"
                    }
                  >
                    Send
                  </Button>
                </form>
              ) : null}

              {phase === "complete" ? (
                <p className="text-sm text-muted-foreground">
                  All steps complete — submit your application below when ready.
                </p>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      {polling ? (
        <p className="text-center text-xs text-muted-foreground">
          Loading your requirements…
        </p>
      ) : null}
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardFooter className="flex flex-wrap gap-3 border-t border-border bg-muted/30 p-4 sm:p-6">
          <Button
            size="lg"
            disabled={
              submitting ||
              status === "PENDING_REVIEW" ||
              phase !== "complete"
            }
            onClick={async () => {
              setSubmitting(true);
              setError(null);
              try {
                const res = await fetch(
                  `/api/applications/${applicationId}/submit`,
                  { method: "POST" },
                );
                const json = await res.json();
                if (!res.ok) throw new Error(json.error ?? "Submit failed");
                setStatus(json.status ?? "PENDING_REVIEW");
                appendAssistant(
                  `Application submitted successfully. Our team will review it shortly.${
                    json.recommendation?.recommendation
                      ? ` Initial recommendation: ${json.recommendation.recommendation}.`
                      : ""
                  }`,
                  "submit",
                );
              } catch (e) {
                setError(e instanceof Error ? e.message : "Submit failed");
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {submitting
              ? "Submitting…"
              : status === "PENDING_REVIEW"
                ? "Submitted"
                : "Submit application"}
          </Button>
          <Button
            variant="outline"
            disabled={verifying || sending || status === "PENDING_REVIEW"}
            onClick={async () => {
              setVerifying(true);
              setError(null);
              try {
                const res = await fetch(
                  `/api/verification/${applicationId}/run`,
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({}),
                  },
                );
                const json = await res.json();
                if (!res.ok) throw new Error(json.error ?? "Verification failed");
                appendAssistant(
                  `FMCSA verification finished with status: ${json.verification?.status ?? json.status ?? "complete"}.`,
                  "fmcsa",
                );
                await loadQuestions();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Verification failed");
              } finally {
                setVerifying(false);
              }
            }}
          >
            {verifying ? "Running check…" : "Run DOT/MC check"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
