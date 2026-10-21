import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 px-6 py-16 text-center">
      <p className="text-base font-medium text-foreground">{title}</p>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{children}</p>
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
        {description && <p className="mt-1 max-w-3xl text-sm text-muted-foreground lg:max-w-none">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:pt-0.5">{actions}</div>}
    </div>
  );
}

export function ContentCard({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-lg border border-border bg-card shadow-sm", className)}>{children}</div>;
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{children}</p>;
}

export function Metric({
  label,
  value,
  highlight,
  compact,
  className,
}: {
  label: string;
  value: number;
  highlight?: boolean;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        compact
          ? "rounded-md border border-sidebar-border bg-sidebar-accent/25 px-2 py-1.5"
          : "min-w-0 flex-1 rounded-xl border border-border bg-card px-4 py-3 shadow-sm sm:min-w-[8.5rem] sm:py-4",
        highlight && !compact && "border-primary/40 ring-1 ring-primary/20",
        highlight && compact && "border-sidebar-primary/40 ring-1 ring-sidebar-primary/20",
        className,
      )}
    >
      <p className={cn("font-semibold tabular-nums tracking-tight", compact ? "text-lg" : "text-3xl", highlight && (compact ? "text-sidebar-primary" : "text-primary"))}>{value}</p>
      <p className={cn("text-[10px] font-medium leading-tight sm:text-xs", compact ? "text-sidebar-foreground/65" : "text-muted-foreground")}>{label}</p>
    </div>
  );
}

export function NavIcon({ name, className }: { name: string; className?: string }) {
  const paths: Record<string, string> = {
    models: "M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z",
    find: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
    today: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
    applications: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
    outreach: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
    resumes: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    ignored: "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636",
    answers: "M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z",
    agents: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
    guides: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
    schedule: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
    runs: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
  };
  const d = paths[name] ?? paths.today;
  return (
    <svg aria-hidden className={cn("size-4 shrink-0 opacity-80", className)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

export function SidebarLink({ href, active, icon, badge, children }: { href: string; active: boolean; icon: string; badge?: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
      )}
    >
      <NavIcon name={icon} />
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {badge && <span className="shrink-0 rounded-full bg-sidebar-primary/30 px-2 py-0.5 text-[10px] font-semibold">{badge}</span>}
    </Link>
  );
}
