import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  href = "/",
}: {
  className?: string;
  href?: string;
}) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2", className)}>
      <span
        className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground shadow-sm"
        aria-hidden
      >
        CF
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-base font-semibold tracking-tight text-foreground">
          CarrierFlow
        </span>
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Fabuwood
        </span>
      </span>
    </Link>
  );
}
