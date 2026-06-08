import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { AppHeader } from "@/components/layout/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const ADMIN_ROLES = new Set(["SUPER_ADMIN", "ADMIN", "REVIEWER"]);

export default async function HomePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/sign-in");
  }

  const isAdmin = ADMIN_ROLES.has(session.user.role);

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
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
        <div className="space-y-2">
          <Badge variant="secondary">Welcome back</Badge>
          <h1 className="text-3xl font-semibold tracking-tight">
            {isAdmin ? "Operations dashboard" : "Your onboarding hub"}
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            {isAdmin
              ? "Review carrier applications, manage rules, and configure AI agents."
              : "Complete your carrier profile, upload documents, and submit for Fabuwood review."}
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <Card className="border-primary/20 shadow-sm transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle>
                {isAdmin ? "Review applications" : "Continue onboarding"}
              </CardTitle>
              <CardDescription>
                {isAdmin
                  ? "See pending reviews, risk scores, and approval history."
                  : "Pick up your interview, documents, and identity verification."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href={isAdmin ? "/applications" : "/onboarding"}>
                  {isAdmin ? "Open admin dashboard" : "Start onboarding"}
                </Link>
              </Button>
            </CardContent>
          </Card>

          {!isAdmin ? (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>What you&apos;ll need</CardTitle>
                <CardDescription>
                  Typical onboarding takes 15–20 minutes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex gap-2">
                    <span className="text-primary">1.</span>
                    Carrier type and operating details
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">2.</span>
                    Insurance and authority documents
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">3.</span>
                    Driver&apos;s license and selfie for identity
                  </li>
                </ul>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Quick links</CardTitle>
                <CardDescription>Configuration and compliance</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href="/rules">Rules</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/ai-studio">AI Studio</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/audit">Audit log</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
