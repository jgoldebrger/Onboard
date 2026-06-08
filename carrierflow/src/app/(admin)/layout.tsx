import Link from "next/link";
import { auth, signOut } from "@/auth";
import { AdminNav } from "@/components/admin/admin-nav";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { requireAdminPage } from "./_lib";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminPage("applications:read");
  const session = await auth();

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/sign-in" });
  }

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-6">
              <Logo href="/applications" className="shrink-0" />
              <span className="hidden rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground sm:inline">
                Admin
              </span>
            </div>
            <div className="flex items-center gap-3">
              {session?.user?.email ? (
                <span className="hidden text-sm text-muted-foreground sm:inline">
                  {session.user.email}
                </span>
              ) : null}
              <Button asChild variant="ghost" size="sm">
                <Link href="/">Home</Link>
              </Button>
              <form action={signOutAction}>
                <Button type="submit" variant="outline" size="sm">
                  Sign out
                </Button>
              </form>
            </div>
          </div>
          <div className="mt-3 overflow-x-auto pb-1">
            <AdminNav />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
