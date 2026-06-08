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

export function IdentityUpload({ applicationId }: { applicationId: string }) {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = e.currentTarget;
    const data = new FormData(form);
    try {
      const res = await fetch(`/api/identity/${applicationId}/upload`, {
        method: "POST",
        body: data,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      setStatus(json.status);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Identity verification</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a clear photo of your driver&apos;s license and a recent
          selfie. A human reviewer will always confirm the match.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Identity documents</CardTitle>
          <CardDescription>
            Files are encrypted at rest and only visible to authorized reviewers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-5">
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
              description="Face clearly visible, good lighting"
              accept="image/*"
              required
            />
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? "Uploading…" : "Submit for review"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {status ? (
        <Alert variant="success">
          <AlertDescription className="flex flex-wrap items-center gap-2">
            Uploaded successfully.
            <Badge variant={statusBadgeVariant(status)}>
              {status.replace(/_/g, " ")}
            </Badge>
            <span className="text-muted-foreground">
              Manual review required before approval.
            </span>
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
