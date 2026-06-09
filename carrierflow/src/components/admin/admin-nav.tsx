"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/carriers", label: "Carriers" },
  { href: "/compliance", label: "Compliance" },
  { href: "/applications", label: "Applications" },
  { href: "/carrier-types", label: "Carrier types" },
  { href: "/questions", label: "Questions" },
  { href: "/documents", label: "Documents" },
  { href: "/rules", label: "Rules" },
  { href: "/ai-studio", label: "AI Studio" },
  { href: "/risk-rules", label: "Risk rules" },
  { href: "/audit", label: "Audit" },
  { href: "/settings/security", label: "Security" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-1">
      {navItems.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
