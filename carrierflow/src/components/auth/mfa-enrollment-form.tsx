"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type MfaEnrollmentFormProps = {
  required: boolean;
  mfaEnabled: boolean;
};

export function MfaEnrollmentForm({
  required,
  mfaEnabled,
}: MfaEnrollmentFormProps) {
  const router = useRouter();
  const [secret, setSecret] = useState<string | null>(null);
  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function startEnrollment() {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/mfa/enroll", { method: "POST" });
    setLoading(false);

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Could not start MFA enrollment");
      return;
    }

    const data = (await res.json()) as { secret: string; otpauthUrl: string };
    setSecret(data.secret);
    setOtpauthUrl(data.otpauthUrl);
  }

  async function confirmEnrollment(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/mfa/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    setLoading(false);

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Invalid code");
      return;
    }

    router.replace("/applications");
    router.refresh();
  }

  if (mfaEnabled) {
    return (
      <Alert>
        <AlertDescription>
          Two-factor authentication is enabled on your account.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {required ? (
        <Alert>
          <AlertDescription>
            Admin accounts must enroll an authenticator app before accessing the
            admin dashboard.
          </AlertDescription>
        </Alert>
      ) : null}

      {!secret ? (
        <Button type="button" onClick={startEnrollment} disabled={loading}>
          {loading ? "Preparing…" : "Set up authenticator app"}
        </Button>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border border-border/60 bg-muted/40 p-4 text-sm">
            <p className="font-medium text-foreground">Manual setup key</p>
            <p className="mt-1 break-all font-mono text-xs">{secret}</p>
            {otpauthUrl ? (
              <p className="mt-3 text-muted-foreground">
                Add this account in Google Authenticator, 1Password, or another
                TOTP app using the key above or this URL:
              </p>
            ) : null}
            {otpauthUrl ? (
              <p className="mt-2 break-all text-xs text-muted-foreground">
                {otpauthUrl}
              </p>
            ) : null}
          </div>

          <form onSubmit={confirmEnrollment} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mfa-code">Authenticator code</Label>
              <Input
                id="mfa-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="6-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </div>
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <Button type="submit" disabled={loading}>
              {loading ? "Verifying…" : "Enable two-factor authentication"}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
