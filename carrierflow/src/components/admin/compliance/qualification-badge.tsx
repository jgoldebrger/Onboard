import type { QualificationStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import {
  QUALIFICATION_COLORS,
  QUALIFICATION_LABELS,
} from "@/lib/compliance/types";

const variantMap = {
  green: "success",
  yellow: "warning",
  red: "destructive",
  gray: "secondary",
} as const;

export function QualificationBadge({
  status,
  className,
}: {
  status: QualificationStatus | null | undefined;
  className?: string;
}) {
  if (!status) {
    return (
      <Badge variant="secondary" className={className}>
        Not monitored
      </Badge>
    );
  }

  const color = QUALIFICATION_COLORS[status];
  return (
    <Badge variant={variantMap[color]} className={className}>
      {QUALIFICATION_LABELS[status]}
    </Badge>
  );
}
