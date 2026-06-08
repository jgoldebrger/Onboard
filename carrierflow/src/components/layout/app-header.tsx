import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AppHeader({
  email,
  role,
  signOutAction,
  className,
}: {
  email?: string;
  role?: string;
  signOutAction?: () => Promise<void>;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur-md",
        className,
      )}
    >
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <div className="flex items-center gap-3">
          {email ? (
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-foreground">{email}</p>
              {role ? (
                <p className="text-xs text-muted-foreground">{role}</p>
              ) : null}
            </div>
          ) : null}
          {signOutAction ? (
            <form action={signOutAction}>
              <Button type="submit" variant="outline" size="sm">
                Sign out
              </Button>
            </form>
          ) : (
            <Button asChild variant="outline" size="sm">
              <Link href="/sign-in">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
