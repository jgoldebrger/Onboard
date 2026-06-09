import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { CarrierProfileForm } from "@/components/carrier/profile-form";
import { AppHeader } from "@/components/layout/app-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function CarrierProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

  const user = await getSessionUser();
  if (!user) redirect("/sign-in");

  const approved = await db.onboardingApplication.findFirst({
    where: { userId: user.id, status: "APPROVED" },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });

  if (!approved) {
    redirect("/onboarding");
  }

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
        <div className="mb-6 flex flex-wrap items-center gap-3 text-sm">
          <Link
            href="/onboarding/compliance"
            className="text-muted-foreground hover:text-foreground"
          >
            ← Compliance portal
          </Link>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Carrier profile</CardTitle>
            <CardDescription>
              Update dispatch contact details for Fabuwood ops. Legal name and DOT
              are locked after approval.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CarrierProfileForm
              initial={{
                email: user.email,
                companyName: user.companyName,
                contactPhone: user.contactPhone,
                contactEmail: user.contactEmail,
              }}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
