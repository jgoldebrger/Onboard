import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { AppHeader } from "@/components/layout/app-header";

export default async function CarrierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/sign-in");

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
      {children}
    </div>
  );
}
