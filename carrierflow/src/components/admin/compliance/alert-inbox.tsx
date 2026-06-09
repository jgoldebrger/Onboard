"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { acknowledgeComplianceAlert } from "@/app/(admin)/compliance/actions";

export type ComplianceAlertRow = {
  id: string;
  type: string;
  severity: string;
  title: string;
  message: string | null;
  createdAt: string;
  carrierApplicationId: string;
  carrierLabel: string;
};

export function AlertInbox({ alerts }: { alerts: ComplianceAlertRow[] }) {
  const [pending, startTransition] = useTransition();

  if (alerts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No open compliance alerts.</p>
    );
  }

  return (
    <ul className="divide-y rounded-lg border text-sm">
      {alerts.map((alert) => (
        <li key={alert.id} className="px-4 py-3 space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{alert.title}</span>
                <Badge
                  variant={
                    alert.severity === "high" ? "destructive" : "warning"
                  }
                >
                  {alert.severity}
                </Badge>
                <Badge variant="outline">{alert.type.replace(/_/g, " ")}</Badge>
              </div>
              {alert.message ? (
                <p className="mt-1 text-muted-foreground">{alert.message}</p>
              ) : null}
              <p className="mt-1 text-xs text-muted-foreground">
                {alert.carrierLabel} ·{" "}
                {new Date(alert.createdAt).toLocaleString()}
              </p>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={`/carriers/${alert.carrierApplicationId}`}>
                  View carrier
                </Link>
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={pending}
                onClick={() =>
                  startTransition(() => acknowledgeComplianceAlert(alert.id))
                }
              >
                Acknowledge
              </Button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
