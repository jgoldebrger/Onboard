"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DocumentReviewProgress } from "@/components/carrier/document-review-progress";
import { FileUploadField } from "@/components/carrier/file-upload-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge, statusBadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type ReviewPoll = {
  status: string;
  reviewProgress: number;
  reviewStep: string | null;
  failureReasons?: string[];
};

function isReviewDone(status: string) {
  return status !== "PROCESSING" && status !== "PENDING";
}

export function ChatDocumentUpload({
  applicationId,
  documentTypeId,
  documentName,
  awaitingReview = false,
  processingDocumentId = null,
  initialProgress = 0,
  initialStep = null,
  onUploadStarted,
  onReviewComplete,
}: {
  applicationId: string;
  documentTypeId: string;
  documentName: string;
  awaitingReview?: boolean;
  processingDocumentId?: string | null;
  initialProgress?: number;
  initialStep?: string | null;
  onUploadStarted?: () => void;
  onReviewComplete: (result: {
    documentId: string;
    status: string;
    documentName: string;
  }) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [reviewing, setReviewing] = useState(awaitingReview);
  const [error, setError] = useState<string | null>(null);
  const [reviewStatus, setReviewStatus] = useState<string | null>(null);
  const [reviewProgress, setReviewProgress] = useState(initialProgress);
  const [reviewStep, setReviewStep] = useState<string | null>(initialStep);
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(
    processingDocumentId,
  );
  const completedRef = useRef(false);

  useEffect(() => {
    setReviewing(awaitingReview);
    if (processingDocumentId) {
      setActiveDocumentId(processingDocumentId);
    }
    if (awaitingReview) {
      setReviewProgress(initialProgress);
      setReviewStep(initialStep);
    }
  }, [
    awaitingReview,
    processingDocumentId,
    initialProgress,
    initialStep,
  ]);

  const handleReviewComplete = useCallback(
    (result: { documentId: string; status: string; documentName: string }) => {
      if (completedRef.current && result.status !== "FAILED") return;
      if (result.status !== "FAILED") {
        completedRef.current = true;
        setReviewProgress(100);
        setReviewStep("Review complete");
      }
      setReviewing(false);
      onReviewComplete(result);
    },
    [onReviewComplete],
  );

  const applyReviewPoll = useCallback((json: ReviewPoll) => {
    setReviewStatus(json.status);
    if (typeof json.reviewProgress === "number") {
      setReviewProgress(json.reviewProgress);
    }
    if (json.reviewStep != null) {
      setReviewStep(json.reviewStep);
    }
  }, []);

  const reviewApiBase = `/api/interview/${applicationId}/documents`;

  const pollReviewOnce = useCallback(
    async (docId: string): Promise<string | null> => {
      const res = await fetch(`${reviewApiBase}/${docId}/review`, {
        credentials: "same-origin",
      });
      if (!res.ok) return null;
      const json = (await res.json()) as ReviewPoll;
      applyReviewPoll(json);
      return isReviewDone(json.status) ? json.status : null;
    },
    [reviewApiBase, applyReviewPoll],
  );

  const pollFromQuestions = useCallback(
    async (docId: string): Promise<string | null> => {
      const res = await fetch(`/api/interview/${applicationId}/questions`, {
        credentials: "same-origin",
      });
      if (!res.ok) return null;
      const json = (await res.json()) as {
        processingDocument?: {
          documentId: string;
          reviewProgress: number;
          reviewStep: string | null;
        } | null;
        documentTypes?: {
          id: string;
          reviewStatus: string | null;
        }[];
      };
      const proc = json.processingDocument;
      if (proc?.documentId === docId) {
        applyReviewPoll({
          status: "PROCESSING",
          reviewProgress: proc.reviewProgress,
          reviewStep: proc.reviewStep,
        });
        return null;
      }
      const docType = json.documentTypes?.find((d) => d.id === documentTypeId);
      if (docType?.reviewStatus && isReviewDone(docType.reviewStatus)) {
        applyReviewPoll({
          status: docType.reviewStatus,
          reviewProgress: 100,
          reviewStep: "Review complete",
        });
        return docType.reviewStatus;
      }
      return null;
    },
    [applicationId, documentTypeId, applyReviewPoll],
  );

  const pollReviewLoop = useCallback(
    async (docId: string): Promise<string> => {
      for (let i = 0; i < 45; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        const done =
          (await pollReviewOnce(docId)) ?? (await pollFromQuestions(docId));
        if (done) return done;
      }
      return "PROCESSING";
    },
    [pollReviewOnce, pollFromQuestions],
  );

  const waitForReview = useCallback(
    async (docId: string): Promise<string> => {
      if (typeof EventSource !== "undefined") {
        return new Promise((resolve) => {
          const es = new EventSource(`${reviewApiBase}/${docId}/stream`);
          es.onmessage = (ev) => {
            try {
              const json = JSON.parse(ev.data) as ReviewPoll & {
                error?: string;
              };
              if (json.error) {
                es.close();
                void pollReviewLoop(docId).then(resolve);
                return;
              }
              applyReviewPoll(json);
              if (json.status && isReviewDone(json.status)) {
                es.close();
                resolve(json.status);
              }
            } catch {
              /* ignore */
            }
          };
          es.onerror = () => {
            es.close();
            void pollReviewLoop(docId).then(resolve);
          };
        });
      }

      return pollReviewLoop(docId);
    },
    [reviewApiBase, applyReviewPoll, pollReviewLoop],
  );

  useEffect(() => {
    if (!reviewing || !activeDocumentId || loading) return;
    if (completedRef.current) return;

    let cancelled = false;
    void waitForReview(activeDocumentId).then((status) => {
      if (cancelled || completedRef.current) return;
      if (isReviewDone(status)) {
        if (status === "FAILED") {
          setError(
            `That file doesn't look like a valid ${documentName}. Please upload the correct document.`,
          );
        }
        handleReviewComplete({
          documentId: activeDocumentId,
          status,
          documentName,
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    reviewing,
    activeDocumentId,
    loading,
    documentName,
    waitForReview,
    handleReviewComplete,
  ]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    completedRef.current = false;
    const data = new FormData(e.currentTarget);
    data.set("documentTypeId", documentTypeId);
    try {
      const res = await fetch(`/api/documents/${applicationId}/upload`, {
        method: "POST",
        body: data,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");

      const docId = json.documentId as string;
      setActiveDocumentId(docId);
      setReviewing(true);
      setReviewProgress(5);
      setReviewStep("Upload received");
      onUploadStarted?.();

      const initialStatus = json.reviewStatus ?? "PROCESSING";
      setReviewStatus(initialStatus);
    } catch (err) {
      setReviewing(false);
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  if (reviewing) {
    return (
      <DocumentReviewProgress
        documentName={documentName}
        progress={reviewProgress}
        step={reviewStep}
        status={reviewStatus}
      />
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <form onSubmit={onSubmit} className="space-y-4">
        <FileUploadField
          name="file"
          label={documentName}
          accept=".pdf,image/*"
          required
        />
        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
          {loading ? "Uploading…" : `Upload ${documentName}`}
        </Button>
      </form>
      {error ? (
        <Alert variant="destructive" className="mt-3">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}

export function ChatIdentityUpload({
  applicationId,
  onUploaded,
}: {
  applicationId: string;
  onUploaded: (status: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const data = new FormData(e.currentTarget);
    try {
      const res = await fetch(`/api/identity/${applicationId}/upload`, {
        method: "POST",
        body: data,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      setStatus(json.status);
      onUploaded(json.status);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <form onSubmit={onSubmit} className="space-y-4">
        <FileUploadField
          name="dl"
          label="Driver's license"
          description="Front of license — PDF or photo"
          accept="image/*,application/pdf"
          required
        />
        <FileUploadField
          name="selfie"
          label="Selfie"
          description="Face clearly visible"
          accept="image/*"
          required
        />
        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
          {loading ? "Uploading…" : "Submit identity verification"}
        </Button>
      </form>
      {status ? (
        <Alert variant="success" className="mt-3">
          <AlertDescription className="flex flex-wrap items-center gap-2">
            Identity submitted.
            <Badge variant={statusBadgeVariant(status)}>
              {status.replace(/_/g, " ")}
            </Badge>
          </AlertDescription>
        </Alert>
      ) : null}
      {error ? (
        <Alert variant="destructive" className="mt-3">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
