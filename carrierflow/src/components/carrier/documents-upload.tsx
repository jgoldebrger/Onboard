"use client";

import { useEffect, useState } from "react";
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
import { Label } from "@/components/ui/label";

type DocType = { id: string; key: string; name: string };

export function DocumentsUpload({ applicationId }: { applicationId: string }) {
  const [documentTypes, setDocumentTypes] = useState<DocType[]>([]);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [reviewStatus, setReviewStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/interview/${applicationId}/questions`)
      .then((r) => r.json())
      .then((json: { documentTypes?: DocType[] }) => {
        setDocumentTypes(json.documentTypes ?? []);
      })
      .catch(() => undefined);
  }, [applicationId]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = e.currentTarget;
    const data = new FormData(form);
    try {
      const res = await fetch(`/api/documents/${applicationId}/upload`, {
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
        <h1 className="text-2xl font-semibold">Documents</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload certificates and authority letters. We&apos;ll review them
          automatically and flag anything that needs attention.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload a document</CardTitle>
          <CardDescription>
            {documentTypes.length > 0
              ? `Required for your application: ${documentTypes.map((d) => d.name).join(", ")}`
              : "Select the document type that best matches your file."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-5">
            <FileUploadField
              name="file"
              label="Document file"
              accept=".pdf,image/*"
              required
            />

            {documentTypes.length > 0 ? (
              <div className="space-y-2">
                <Label htmlFor="documentTypeId">Document type</Label>
                <select
                  id="documentTypeId"
                  name="documentTypeId"
                  className="flex h-10 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  defaultValue=""
                >
                  <option value="">Select type…</option>
                  {documentTypes.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? "Uploading…" : "Upload document"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {documentId ? (
        <Alert variant="success">
          <AlertDescription className="flex flex-wrap items-center gap-2">
            <span>Upload received.</span>
            {reviewStatus ? (
              <Badge variant={statusBadgeVariant(reviewStatus)}>
                {reviewStatus.replace(/_/g, " ")}
              </Badge>
            ) : (
              <span className="text-muted-foreground">Review in progress…</span>
            )}
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
