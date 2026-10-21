import type { ReactNode } from "react";
import Link from "next/link";
import { Suspense } from "react";
import { logout } from "@/app/actions";
import { authEnabled } from "@/auth";
import { Button } from "@/components/ui/button";
import { Metric } from "./design";
import { MobileDock } from "./mobile-dock";
import { NavLink } from "./nav-link";
import { NavPrefetch } from "./nav-prefetch";

export type DeskTab = "today" | "find" | "applications" | "outreach" | "resumes" | "ignored" | "answers" | "agents" | "models" | "schedule" | "runs";

export const NAV: { tab: DeskTab; label: string; icon: string }[] = [
  { tab: "today", label: "Overview", icon: "today" },
  { tab: "find", label: "Find jobs", icon: "find" },
  { tab: "applications", label: "Applications", icon: "applications" },
  { tab: "outreach", label: "Outreach", icon: "outreach" },
  { tab: "resumes", label: "Resumes", icon: "resumes" },
  { tab: "ignored", label: "Ignored", icon: "ignored" },
  { tab: "answers", label: "My answers", icon: "answers" },
  { tab: "agents", label: "Agents", icon: "agents" },
  { tab: "models", label: "Cloud models", icon: "models" },
  { tab: "schedule", label: "Schedule", icon: "schedule" },
  { tab: "runs", label: "Run log", icon: "runs" },
];

export function href(tab: DeskTab) {
  return tab === "today" ? "/" : `/?tab=${tab}`;
}

export function DashboardLayout({
  tab,
  metrics,
  navBadges,
  runningBanner,
  notice,
  children,
}: {
  tab: DeskTab;
  metrics: { waiting: number; ready: number; applied: number; contacted: number; ignored: number };
  navBadges: Partial<Record<DeskTab, string>>;
  runningBanner?: ReactNode;
  notice?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-svh w-full bg-background">
      <NavPrefetch />
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
        <div className="border-b border-sidebar-border px-5 py-5">
          <Link href="/" prefetch className="block">
            <span className="text-lg font-semibold tracking-tight text-sidebar-accent-foreground">Shortlist</span>
            <span className="mt-0.5 block text-xs text-sidebar-foreground/60">AI engineer pipeline</span>
          </Link>
        </div>
        <Suspense fallback={<div className="flex-1 px-2 py-3" aria-hidden />}>
          <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3" aria-label="Main">
            {NAV.map(({ tab: t, label, icon }) => (
              <NavLink key={t} tab={t} href={href(t)} icon={icon} badge={navBadges[t]} variant="sidebar">
                {label}
              </NavLink>
            ))}
          </nav>
        </Suspense>
        <div className="space-y-2 border-t border-sidebar-border p-3">
          <Button className="w-full" render={<Link href="/?tab=find" prefetch />} nativeButton={false}>
            Find jobs
          </Button>
          <Button variant="outline" className="w-full border-sidebar-border bg-transparent text-sidebar-foreground hover:bg-sidebar-accent/40" render={<a href="/export" />} nativeButton={false}>
            Export Excel
          </Button>
          {authEnabled() && (
            <form action={logout}>
              <Button type="submit" variant="ghost" className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent/40">
                Log out
              </Button>
            </form>
          )}
        </div>
      </aside>

      <div className="flex min-h-svh min-w-0 flex-1 flex-col lg:pl-[248px]">
        <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
          <div className="flex h-12 items-center justify-between gap-3 px-3 sm:px-6 lg:h-14 lg:px-8">
            <Link href="/" prefetch className="font-semibold lg:hidden">
              Shortlist
            </Link>
            <Link href="/?tab=find" prefetch className="text-sm font-medium text-primary lg:hidden">
              Find jobs
            </Link>
          </div>
          <div className="flex gap-2 overflow-x-auto border-t border-border px-3 py-2.5 sm:px-6 lg:px-8">
            <Metric label="Waiting on you" value={metrics.waiting} highlight={metrics.waiting > 0} />
            <Metric label="Ready to submit" value={metrics.ready} highlight={metrics.ready > 0} />
            <Metric label="Applied" value={metrics.applied} />
            <Metric label="Contacted" value={metrics.contacted} />
            <Metric label="Not applied" value={metrics.ignored} />
          </div>
        </header>

        <main className="w-full flex-1 px-3 py-6 sm:px-6 lg:px-8 lg:py-8">
          {notice}
          {runningBanner}
          <div className="w-full">{children}</div>
        </main>

        <Suspense fallback={null}>
          <MobileDock tab={tab} navBadges={navBadges} />
        </Suspense>
      </div>
    </div>
  );
}
