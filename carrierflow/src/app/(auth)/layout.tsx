import { Logo } from "@/components/layout/logo";

const FEATURES = [
  {
    title: "Guided onboarding chat",
    description: "DOT-first interview that adapts to your carrier type.",
  },
  {
    title: "Document intelligence",
    description: "Upload COI, W-9, and identity — AI reviews in minutes.",
  },
  {
    title: "FMCSA verification",
    description: "Live registry lookup with risk flags and pre-fill.",
  },
] as const;

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <aside className="relative hidden flex-col justify-between overflow-hidden p-10 text-primary-foreground lg:flex xl:p-14">
        <div
          className="absolute inset-0 bg-gradient-to-br from-[#0c4a44] via-primary to-[#134e4a]"
          aria-hidden
        />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.12) 0%, transparent 45%), radial-gradient(circle at 80% 80%, rgba(0,0,0,0.15) 0%, transparent 50%)",
          }}
          aria-hidden
        />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
          aria-hidden
        />

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2.5">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-sm font-bold shadow-sm ring-1 ring-white/20 backdrop-blur-sm">
              CF
            </span>
            <div className="leading-tight">
              <span className="block text-lg font-semibold tracking-tight">
                CarrierFlow
              </span>
              <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-teal-100/80">
                Fabuwood
              </span>
            </div>
          </div>
        </div>

        <div className="relative z-10 max-w-md space-y-8">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-100/75">
              Enterprise carrier onboarding
            </p>
            <h1 className="text-3xl font-semibold leading-[1.15] tracking-tight xl:text-4xl">
              One workflow from signup to approval.
            </h1>
            <p className="text-sm leading-relaxed text-teal-50/85">
              Interviews, documents, government verification, and admin review —
              built for Fabuwood logistics partners.
            </p>
          </div>

          <ul className="space-y-4">
            {FEATURES.map((feature) => (
              <li key={feature.title} className="flex gap-3">
                <span
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/20"
                  aria-hidden
                >
                  <svg
                    viewBox="0 0 12 12"
                    className="h-3 w-3 text-teal-50"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-medium text-white">{feature.title}</p>
                  <p className="text-sm leading-relaxed text-teal-100/75">
                    {feature.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-teal-100/60">
          Secure · Audited · Role-based access
        </p>
      </aside>

      <main className="relative flex min-h-dvh flex-col bg-[linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)]">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 100% 0%, rgba(13,148,136,0.08) 0%, transparent 40%)",
          }}
          aria-hidden
        />

        <header className="relative z-10 flex items-center justify-between px-6 py-5 lg:px-10">
          <Logo className="lg:hidden" />
          <div className="hidden text-right text-xs text-muted-foreground lg:block">
            Fabuwood carrier portal
          </div>
        </header>

        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-10 pt-2 sm:px-10">
          {children}
        </div>
      </main>
    </div>
  );
}
