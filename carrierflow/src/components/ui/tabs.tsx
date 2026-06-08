"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type TabItem = {
  id: string;
  label: string;
  content: ReactNode;
  badge?: string | number;
};

export function Tabs({
  tabs,
  defaultTabId,
  className,
}: {
  tabs: TabItem[];
  defaultTabId?: string;
  className?: string;
}) {
  const [activeId, setActiveId] = useState(
    defaultTabId && tabs.some((t) => t.id === defaultTabId)
      ? defaultTabId
      : (tabs[0]?.id ?? ""),
  );

  const active = tabs.find((t) => t.id === activeId) ?? tabs[0];

  if (!tabs.length) {
    return <p className="text-sm text-muted-foreground">No tabs to display.</p>;
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div
        className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-muted/30 p-1"
        role="tablist"
      >
        {tabs.map((tab) => {
          const selected = tab.id === activeId;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveId(tab.id)}
              className={cn(
                "shrink-0 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                selected
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
              )}
            >
              {tab.label}
              {tab.badge != null && tab.badge !== "" ? (
                <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs font-normal">
                  {tab.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" className="min-h-[12rem]">
        {active?.content}
      </div>
    </div>
  );
}
