"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type VerifyEmailPanelProps = {
  email?: string;
  isVerified: boolean;
};

export function VerifyEmailPanel({ email, isVerified }: VerifyEmailPanelProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const status = searchParams.get("status");
  const returnTo = searchParams.get("returnTo");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function resend() {
    setLoading(true);
    setError(null);
    setMessage(null);

    const res = await fetch("/api/auth/resend-verification", { method: "POST" });
    setLoading(false);

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Could not resend verification email");
      return;
    }

    const data = (await res.json()) as { alreadyVerified?: boolean; sent?: boolean };
    if (data.alreadyVerified) {
      router.replace(returnTo ?? "/");
      return;
    }

    setMessage(
      data.sent
        ? "Verification email sent. Check your inbox."
        : "Email delivery is not configured — ask an admin to verify your account.",
    );
  }

  if (isVerified) {
    return (
      <div className="w-full max-w-[420px] space-y-4 text-center lg:text-left">
        <h1 className="text-3xl font-semibold tracking-tight">Email verified</h1>
        <p className="text-sm text-muted-foreground">
          Your email is verified. You can continue onboarding.
        </p>
        <Button asChild className="h-11">
          <Link href={returnTo ?? "/onboarding"}>Continue</Link>
        </Button>
      </div>
    );
  }

  const statusMessage =
    status === "success"
      ? "Your email has been verified."
      : status === "expired"
        ? "That verification link has expired."
        : status === "invalid"
          ? "That verification link is invalid."
          : null;

  return (
    <div className="w-full max-w-[420px]">
      <div className="mb-8 space-y-2 text-center lg:text-left">
        <h1 className="text-3xl font-semibold tracking-tight">
          Verify your email
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {email
            ? `We sent a verification link to ${email}. Open it to unlock onboarding and submission.`
            : "Check your inbox for a verification link to continue."}
        </p>
      </div>

      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-[0_20px_50px_-24px_rgba(15,23,42,0.25)] sm:p-8">
        {statusMessage ? (
          <Alert className="mb-4">
            <AlertDescription>{statusMessage}</AlertDescription>
          </Alert>
        ) : null}
        {message ? (
          <Alert className="mb-4">
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        ) : null}
        {error ? (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="space-y-3">
          <Button
            type="button"
            className="h-11 w-full"
            onClick={resend}
            disabled={loading}
          >
            {loading ? "Sending…" : "Resend verification email"}
          </Button>
          <Button asChild variant="outline" className="h-11 w-full">
            <Link href="/sign-in">Back to sign in</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
