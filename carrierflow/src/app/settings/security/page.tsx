import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { MfaEnrollmentForm } from "@/components/auth/mfa-enrollment-form";
import { AppHeader } from "@/components/layout/app-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSessionUser } from "@/lib/auth";
import { isAdminRole } from "@/lib/auth/mfa";

type PageProps = {
  searchParams: Promise<{ required?: string }>;
};

export default async function SecuritySettingsPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  if (!isAdminRole(user.role)) {
    redirect("/");
  }

  const params = await searchParams;
  const required = params.required === "1";

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/sign-in" });
  }

  return (
    <div className="flex min-h-full flex-col">
      <AppHeader
        email={session.user.email ?? undefined}
        role={session.user.role}
        signOutAction={signOutAction}
      />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
        <div className="mb-6">
          <Link
            href="/applications"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to admin
          </Link>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>
              Protect admin access with a time-based one-time password (TOTP)
              from your authenticator app.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MfaEnrollmentForm
              required={required}
              mfaEnabled={user.mfaEnabled}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
