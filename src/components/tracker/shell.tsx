import Link from "next/link";
import type { ReactNode } from "react";

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-svh pb-16">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-32 top-20 h-72 w-72 rounded-full bg-indigo-400/20 blur-3xl" />
        <div className="absolute -right-24 top-40 h-80 w-80 rounded-full bg-violet-400/15 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-64 w-96 rounded-full bg-sky-400/10 blur-3xl" />
      </div>
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">{children}</div>
    </div>
  );
}

export function StatCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`stat-card ${highlight ? "ring-1 ring-[var(--brand)]/30" : ""}`}>
      <div className={`text-2xl font-semibold tabular-nums tracking-tight ${highlight ? "text-[var(--brand)]" : ""}`}>{value}</div>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
    </div>
  );
}

export function TabNav({ items }: { items: { key: string; label: string; href: string; active: boolean }[] }) {
  return (
    <nav aria-label="Dashboard sections" className="nav-pill flex w-full gap-0.5 overflow-x-auto sm:w-fit">
      {items.map(({ key, label, href, active }) => (
        <Link
          key={key}
          href={href}
          aria-current={active ? "page" : undefined}
          className={`whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200 ${active ? "nav-pill-active" : "text-muted-foreground hover:bg-background/60 hover:text-foreground"}`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`glass-panel ${className}`}>{children}</div>;
}
