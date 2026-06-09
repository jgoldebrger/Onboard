"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type NotificationItem = {
  id: string;
  kind: "compliance_alert";
  title: string;
  message: string | null;
  severity: string;
  href: string;
  createdAt: string;
  carrierLabel: string;
};

type NotificationsPayload = {
  totalUnread: number;
  openComplianceAlerts: number;
  pendingReview: number;
  items: NotificationItem[];
};

export function AdminNotificationBell({
  initialCounts,
}: {
  initialCounts: {
    totalUnread: number;
    openComplianceAlerts: number;
    pendingReview: number;
  };
}) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<NotificationsPayload | null>({
    totalUnread: initialCounts.totalUnread,
    openComplianceAlerts: initialCounts.openComplianceAlerts,
    pendingReview: initialCounts.pendingReview,
    items: [],
  });
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/notifications");
    if (!res.ok) return;
    setData(await res.json());
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!panelRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const count = data?.totalUnread ?? 0;

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => {
          if (open) {
            setOpen(false);
            return;
          }
          void load().then(() => setOpen(true));
        }}
        className="relative rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label={`Notifications${count > 0 ? `, ${count} unread` : ""}`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {count > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-lg border border-border bg-card shadow-lg">
          <div className="border-b px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            <p className="text-xs text-muted-foreground">
              {data?.pendingReview ?? 0} pending review ·{" "}
              {data?.openComplianceAlerts ?? 0} compliance alerts
            </p>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {data?.pendingReview ? (
              <Link
                href="/applications?status=PENDING_REVIEW"
                className="block border-b px-4 py-3 text-sm hover:bg-muted/50"
                onClick={() => setOpen(false)}
              >
                <span className="font-medium">
                  {data.pendingReview} application
                  {data.pendingReview === 1 ? "" : "s"} awaiting review
                </span>
              </Link>
            ) : null}
            {data?.items.length ? (
              data.items.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="block border-b px-4 py-3 text-sm last:border-b-0 hover:bg-muted/50"
                  onClick={() => setOpen(false)}
                >
                  <div className="font-medium">{item.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.carrierLabel} · {item.severity}
                  </div>
                  {item.message ? (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {item.message}
                    </p>
                  ) : null}
                </Link>
              ))
            ) : !data?.pendingReview ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                All caught up
              </p>
            ) : null}
          </div>
          <div className="border-t px-4 py-2">
            <Link
              href="/compliance"
              className={cn("text-xs text-primary hover:underline")}
              onClick={() => setOpen(false)}
            >
              Open compliance inbox →
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
