"use client";

import { useState } from "react";
import { FileUploadField } from "@/components/carrier/file-upload-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge, statusBadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type MonitoredCoi = {
  policyNumber: string | null;
  expirationDate: string | null;
  effectiveDate: string | null;
};

export function CoiRenewalUpload({
  applicationId,
  monitoredCoi,
}: {
  applicationId: string;
  monitoredCoi: MonitoredCoi | null;
}) {
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [reviewStatus, setReviewStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = e.currentTarget;
    const data = new FormData(form);
    try {
      const res = await fetch(`/api/compliance/${applicationId}/coi-renewal`, {
        method: "POST",
        body: data,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      setDocumentId(json.documentId);
      setReviewStatus(json.reviewStatus);
      watchReview(json.documentId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  function watchReview(docId: string) {
    if (typeof EventSource !== "undefined") {
      const es = new EventSource(
        `/api/interview/${applicationId}/documents/${docId}/stream`,
      );
      es.onmessage = (ev) => {
        try {
          const json = JSON.parse(ev.data) as { status?: string };
          if (json.status) setReviewStatus(json.status);
          if (json.status && json.status !== "PROCESSING") es.close();
        } catch {
          /* ignore */
        }
      };
      es.onerror = () => {
        es.close();
        pollReview(docId);
      };
      return;
    }
    pollReview(docId);
  }

  async function pollReview(docId: string) {
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const res = await fetch(
        `/api/interview/${applicationId}/documents/${docId}/review`,
        { credentials: "same-origin" },
      );
      if (!res.ok) continue;
      const json = await res.json();
      setReviewStatus(json.status);
      if (json.status !== "PROCESSING") return;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Certificate of Insurance renewal</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload an updated COI to keep your compliance profile current. No
          re-onboarding required.
        </p>
      </div>

      {monitoredCoi ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Current COI on file</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Policy:</span>{" "}
              {monitoredCoi.policyNumber ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Effective:</span>{" "}
              {monitoredCoi.effectiveDate
                ? new Date(monitoredCoi.effectiveDate).toLocaleDateString()
                : "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Expires:</span>{" "}
              {monitoredCoi.expirationDate
                ? new Date(monitoredCoi.expirationDate).toLocaleDateString()
                : "—"}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload renewed COI</CardTitle>
          <CardDescription>
            PDF or image. We&apos;ll review automatically and update your
            monitored insurance record.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-5">
            <FileUploadField
              name="file"
              label="Certificate of Insurance"
              accept=".pdf,image/*"
              required
            />
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? "Uploading…" : "Upload renewed COI"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {documentId ? (
        <Alert variant="success">
          <AlertDescription className="flex flex-wrap items-center gap-2">
            <span>Renewal received.</span>
            {reviewStatus ? (
              <Badge variant={statusBadgeVariant(reviewStatus)}>
                {reviewStatus.replace(/_/g, " ")}
              </Badge>
            ) : (
              <span className="text-muted-foreground">Review in progress…</span>
            )}
            {reviewStatus && reviewStatus !== "PROCESSING" ? (
              <span className="text-muted-foreground">
                Your monitored COI and compliance status will update shortly.
              </span>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
