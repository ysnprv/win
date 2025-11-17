"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Database } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    title: "Generate",
    href: "/services/cv-rewriter",
    icon: FileText,
  },
  {
    title: "Database",
    href: "/services/cv-rewriter/database",
    icon: Database,
  },
];

export function CVRewriterNav() {
  const pathname = usePathname();

  return (
    <div className="mb-8">
      <nav className="flex items-center justify-center gap-2 rounded-lg border border-border bg-card/40 p-1 backdrop-blur-sm w-fit mx-auto shadow-sm">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
