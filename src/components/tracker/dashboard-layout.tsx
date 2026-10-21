import type { ReactNode } from "react";
import Link from "next/link";
import { Suspense } from "react";
import { logout } from "@/app/actions";
import { authEnabled } from "@/auth";
import { APP_NAME, APP_TAGLINE } from "@/brand";
import { Button } from "@/components/ui/button";
import { MobileDock } from "./mobile-dock";
import { NavLink } from "./nav-link";
import { NavPrefetch } from "./nav-prefetch";
import { DashboardToolbar } from "./dashboard-toolbar";

export type DeskTab = "today" | "find" | "applications" | "outreach" | "resumes" | "ignored" | "answers" | "agents" | "guides" | "models" | "schedule" | "runs";

export const NAV: { tab: DeskTab; label: string; icon: string }[] = [
  { tab: "today", label: "Overview", icon: "today" },
  { tab: "find", label: "Find jobs", icon: "find" },
  { tab: "applications", label: "Applications", icon: "applications" },
  { tab: "outreach", label: "Outreach", icon: "outreach" },
  { tab: "resumes", label: "Resumes", icon: "resumes" },
  { tab: "ignored", label: "Ignored", icon: "ignored" },
  { tab: "answers", label: "My answers", icon: "answers" },
  { tab: "agents", label: "Agents", icon: "agents" },
  { tab: "guides", label: "Agent guides", icon: "guides" },
  { tab: "models", label: "Cloud models", icon: "models" },
  { tab: "schedule", label: "Schedule", icon: "schedule" },
  { tab: "runs", label: "Run log", icon: "runs" },
];

export function href(tab: DeskTab) {
  return tab === "today" ? "/" : `/?tab=${tab}`;
}

type LayoutMetrics = { waiting: number; ready: number; applied: number; contacted: number; ignored: number };

type DashboardLayoutProps = {
  tab: DeskTab;
  metrics: LayoutMetrics;
  navBadges: Partial<Record<DeskTab, string>>;
  runningBanner?: ReactNode;
  notice?: ReactNode;
  children: ReactNode;
};

export function DashboardLayout({ tab, metrics, navBadges, runningBanner, notice, children }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-svh w-full bg-background">
      <NavPrefetch />
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
        <div className="border-b border-sidebar-border px-5 py-5">
          <Link href="/" prefetch className="block">
            <span className="text-lg font-semibold tracking-tight text-sidebar-accent-foreground">{APP_NAME}</span>
            <span className="mt-0.5 block text-xs text-sidebar-foreground/60">{APP_TAGLINE}</span>
          </Link>
        </div>
        <Suspense fallback={<div className="min-h-0 flex-1 px-2 py-3" aria-hidden />}>
          <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 py-3" aria-label="Main">
            {NAV.map(({ tab: t, label, icon }) => (
              <NavLink key={t} tab={t} href={href(t)} icon={icon} badge={navBadges[t]} variant="sidebar">
                {label}
              </NavLink>
            ))}
          </nav>
        </Suspense>
        {authEnabled() && (
          <div className="border-t border-sidebar-border p-3">
            <form action={logout}>
              <Button type="submit" variant="ghost" className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent/40">
                Log out
              </Button>
            </form>
          </div>
        )}
      </aside>

      <div className="flex min-h-svh min-w-0 flex-1 flex-col lg:pl-[248px]">
        <main className="w-full flex-1 px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
            <div>
              <p className="font-semibold">{APP_NAME}</p>
              <p className="text-xs text-muted-foreground">{APP_TAGLINE}</p>
            </div>
          </div>
          {notice}
          {runningBanner}
          <DashboardToolbar tab={tab} metrics={metrics} />
          <div className="w-full">{children}</div>
        </main>

        <Suspense fallback={null}>
          <MobileDock tab={tab} navBadges={navBadges} />
        </Suspense>
      </div>
    </div>
  );
}
