import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-muted text-muted-foreground",
        outline: "border-border text-foreground",
        success:
          "border-transparent bg-emerald-100 text-emerald-800 dark:text-emerald-900",
        warning:
          "border-transparent bg-amber-100 text-amber-900",
        destructive:
          "border-transparent bg-red-100 text-red-800",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants>) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export function statusBadgeVariant(
  status: string,
): VariantProps<typeof badgeVariants>["variant"] {
  switch (status) {
    case "APPROVED":
    case "PASSED":
      return "success";
    case "PENDING_REVIEW":
    case "PROCESSING":
    case "PENDING":
    case "MANUAL_REVIEW":
    case "NEEDS_REVIEW":
      return "warning";
    case "REJECTED":
    case "FAILED":
      return "destructive";
    default:
      return "secondary";
  }
}
