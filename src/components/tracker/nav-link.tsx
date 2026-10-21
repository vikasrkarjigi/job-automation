"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";
import type { DeskTab } from "./dashboard-layout";
import { NavIcon } from "./design";

function tabFromUrl(pathname: string, tabParam: string | null): DeskTab {
  if (pathname !== "/") return "today";
  const t = tabParam ?? "today";
  const allowed: DeskTab[] = ["today", "find", "applications", "outreach", "resumes", "ignored", "answers", "agents", "guides", "models", "schedule", "runs"];
  return (allowed.includes(t as DeskTab) ? t : "today") as DeskTab;
}

export function NavLink({
  tab,
  href,
  icon,
  badge,
  children,
  variant,
  onNavigate,
}: {
  tab: DeskTab;
  href: string;
  icon: string;
  badge?: string;
  children: React.ReactNode;
  variant: "sidebar" | "bottom" | "pill" | "menu";
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const current = tabFromUrl(pathname, sp.get("tab"));
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const active = current === tab;
  const loading = pending && !active;

  return (
    <Link
      href={href}
      prefetch
      aria-current={active ? "page" : undefined}
      onClick={(e) => {
        onNavigate?.();
        if (active) return;
        e.preventDefault();
        const dest = new URL(href, "http://local");
        const q = sp.get("q");
        if (q) dest.searchParams.set("q", q);
        startTransition(() => router.push(dest.pathname + dest.search));
      }}
      className={cn(
        "relative font-medium transition-all duration-150",
        variant === "bottom" ? "flex flex-col items-center justify-center" : "flex items-center gap-2",
        variant === "sidebar" &&
          cn(
            "w-full rounded-md px-3 py-2.5 text-sm",
            active && "bg-sidebar-primary/15 text-sidebar-accent-foreground shadow-[inset_3px_0_0_0_var(--sidebar-primary)]",
            !active && "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            loading && "opacity-70",
          ),
        variant === "bottom" &&
          cn(
            "min-w-[4.5rem] flex-1 flex-col gap-0.5 rounded-lg px-1 py-2 text-[10px]",
            active && "bg-primary/10 text-primary",
            !active && "text-muted-foreground",
          ),
        variant === "pill" &&
          cn(
            "whitespace-nowrap rounded-full px-3 py-1.5 text-xs",
            active && "bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/30",
            !active && "text-muted-foreground hover:bg-muted",
            loading && "opacity-70",
          ),
        variant === "menu" &&
          cn(
            "flex w-full items-center gap-2 rounded-lg px-3 py-3 text-sm",
            active && "bg-primary/10 font-semibold text-primary ring-1 ring-primary/25",
            !active && "text-foreground hover:bg-muted",
            loading && "opacity-70",
          ),
      )}
    >
      <NavIcon name={icon} className={variant === "bottom" ? "size-5" : undefined} />
      {variant === "bottom" ? <span className="truncate">{children}</span> : <span className="min-w-0 flex-1 truncate">{children}</span>}
      {badge && variant !== "bottom" && (
        <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold", active ? "bg-sidebar-primary text-sidebar-primary-foreground" : "bg-sidebar-accent text-sidebar-foreground")}>
          {badge}
        </span>
      )}
      {active && variant === "bottom" && <span className="absolute -bottom-0.5 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-primary" aria-hidden />}
    </Link>
  );
}
