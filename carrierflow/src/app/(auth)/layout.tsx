import { Logo } from "@/components/layout/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col lg:flex-row">
      <aside className="hidden flex-col justify-between border-r border-border bg-primary p-10 text-primary-foreground lg:flex lg:w-[42%] xl:w-[38%]">
        <div className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15 text-sm font-bold">
            CF
          </span>
          <span className="text-lg font-semibold">CarrierFlow</span>
        </div>
        <div className="space-y-4">
          <h1 className="text-3xl font-semibold leading-tight">
            Carrier onboarding built for enterprise logistics.
          </h1>
          <p className="text-sm leading-relaxed text-teal-50/90">
            Guided interviews, document review, FMCSA verification, and admin
            approval — all in one workflow for Fabuwood partners.
          </p>
        </div>
        <p className="text-xs text-teal-100/70">
          Secure · Audited · Role-based access
        </p>
      </aside>
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-8">
        <div className="mb-8 lg:hidden">
          <Logo />
        </div>
        {children}
      </main>
    </div>
  );
}
