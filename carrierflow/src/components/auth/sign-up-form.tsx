"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type InvitePreview = {
  email: string;
  dotNumber: string | null;
  mcNumber: string | null;
  companyName: string | null;
};

type SignUpFormProps = {
  inviteToken?: string;
};

export function SignUpForm({ inviteToken }: SignUpFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [invitePreview, setInvitePreview] = useState<InvitePreview | null>(
    null,
  );
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!inviteToken) return;

    let cancelled = false;
    (async () => {
      const res = await fetch(
        `/api/invitations/preview?token=${encodeURIComponent(inviteToken)}`,
      );
      if (cancelled) return;

      if (!res.ok) {
        setInviteError("This invitation link is invalid or has expired.");
        return;
      }

      const data = (await res.json()) as InvitePreview;
      setInvitePreview(data);
      setEmail(data.email);
      if (data.companyName) setCompanyName(data.companyName);
    })();

    return () => {
      cancelled = true;
    };
  }, [inviteToken]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        companyName: companyName || undefined,
        inviteToken,
      }),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Registration failed");
      setLoading(false);
      return;
    }

    const data = (await res.json()) as {
      redirectTo?: string;
      emailVerificationRequired?: boolean;
    };

    const signInResult = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);
    if (signInResult?.error) {
      setError("Account created — please sign in.");
      return;
    }

    window.location.href =
      data.redirectTo ?? (data.emailVerificationRequired ? "/verify-email" : "/");
  }

  return (
    <div className="w-full max-w-[420px]">
      <div className="mb-8 space-y-2 text-center lg:text-left">
        <h1 className="text-3xl font-semibold tracking-tight">
          {inviteToken ? "Accept your invitation" : "Create your account"}
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {inviteToken
            ? "Create your account to start Fabuwood carrier onboarding with your pre-filled carrier details."
            : "Register your company to start Fabuwood carrier onboarding. You can add your DOT number in the guided chat."}
        </p>
      </div>

      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-[0_20px_50px_-24px_rgba(15,23,42,0.25)] sm:p-8">
        {inviteError ? (
          <Alert variant="destructive" className="mb-5">
            <AlertDescription>{inviteError}</AlertDescription>
          </Alert>
        ) : null}
        {invitePreview?.dotNumber || invitePreview?.mcNumber ? (
          <div className="mb-5 rounded-lg border border-border/60 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">From your invitation</p>
            {invitePreview.dotNumber ? (
              <p>DOT: {invitePreview.dotNumber}</p>
            ) : null}
            {invitePreview.mcNumber ? (
              <p>MC: {invitePreview.mcNumber}</p>
            ) : null}
          </div>
        ) : null}
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Work email</Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              placeholder="ops@yourcarrier.com"
              className="h-11 bg-background"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              readOnly={Boolean(invitePreview)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              className="h-11 bg-background"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company">Company name (optional)</Label>
            <Input
              id="company"
              type="text"
              autoComplete="organization"
              placeholder="Your carrier LLC"
              className="h-11 bg-background"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <Button
            type="submit"
            className="h-11 w-full text-base shadow-sm"
            disabled={loading || Boolean(inviteError)}
          >
            {loading ? "Creating account…" : "Create account"}
          </Button>
        </form>
      </div>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Already registered?{" "}
        <Link
          href="/sign-in"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
