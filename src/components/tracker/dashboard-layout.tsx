import Link from "next/link";
import type { ReactNode } from "react";
import { logout, startAgent } from "@/app/actions";
import { authEnabled } from "@/auth";
import { Button } from "@/components/ui/button";
import { Metric, SidebarLink } from "./design";
import { SubmitButton } from "./client";

export type DeskTab = "today" | "applications" | "outreach" | "resumes" | "ignored" | "answers" | "agents" | "schedule" | "runs";

const NAV: { tab: DeskTab; label: string; icon: string }[] = [
  { tab: "today", label: "Overview", icon: "today" },
  { tab: "applications", label: "Applications", icon: "applications" },
  { tab: "outreach", label: "Outreach", icon: "outreach" },
  { tab: "resumes", label: "Resumes", icon: "resumes" },
  { tab: "ignored", label: "Ignored", icon: "ignored" },
  { tab: "answers", label: "My answers", icon: "answers" },
  { tab: "agents", label: "Agents & models", icon: "agents" },
  { tab: "schedule", label: "Schedule", icon: "schedule" },
  { tab: "runs", label: "Run log", icon: "runs" },
];

function href(tab: DeskTab) {
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
    <div className="flex min-h-svh bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
        <div className="border-b border-sidebar-border px-5 py-5">
          <Link href="/" className="block">
            <span className="text-lg font-semibold tracking-tight text-sidebar-accent-foreground">Shortlist</span>
            <span className="mt-0.5 block text-xs text-sidebar-foreground/60">AI engineer pipeline</span>
          </Link>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4" aria-label="Main">
          {NAV.map(({ tab: t, label, icon }) => (
            <SidebarLink key={t} href={href(t)} active={tab === t} icon={icon} badge={navBadges[t]}>
              {label}
            </SidebarLink>
          ))}
        </nav>
        <div className="space-y-3 border-t border-sidebar-border p-4">
          <form action={startAgent}>
            <input type="hidden" name="kind" value="fetch" />
            <SubmitButton className="w-full" pendingLabel="Starting…">
              Find jobs now
            </SubmitButton>
          </form>
          <Button variant="outline" className="w-full border-sidebar-border bg-transparent text-sidebar-foreground hover:bg-sidebar-accent/40" render={<a href="/export" />} nativeButton={false}>
            Export Excel
          </Button>
        </div>
      </aside>

      <div className="flex min-h-svh flex-1 flex-col lg:pl-[260px]">
        <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="flex h-14 items-center justify-between gap-4 px-4 lg:px-8">
            <div className="flex items-center gap-3 lg:hidden">
              <span className="font-semibold">Shortlist</span>
            </div>
            <div className="hidden flex-1 gap-2 overflow-x-auto lg:flex">
              {NAV.slice(0, 6).map(({ tab: t, label }) => (
                <Link
                  key={t}
                  href={href(t)}
                  className={`whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
                >
                  {label}
                </Link>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <form action={startAgent} className="lg:hidden">
                <input type="hidden" name="kind" value="fetch" />
                <SubmitButton size="sm" pendingLabel="…">
                  Find jobs
                </SubmitButton>
              </form>
              {authEnabled() && (
                <form action={logout}>
                  <Button type="submit" size="sm" variant="ghost">
                    Log out
                  </Button>
                </form>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 border-t border-border px-4 py-3 sm:grid-cols-5 lg:px-8">
            <Metric label="Waiting on you" value={metrics.waiting} highlight={metrics.waiting > 0} />
            <Metric label="Ready to submit" value={metrics.ready} highlight={metrics.ready > 0} />
            <Metric label="Applied" value={metrics.applied} />
            <Metric label="Contacted" value={metrics.contacted} />
            <Metric label="Not applied" value={metrics.ignored} />
          </div>
        </header>

        <main className="flex-1 px-4 py-8 lg:px-8">
          {notice}
          {runningBanner}
          {children}
        </main>
      </div>
    </div>
  );
}

export { NAV, href };
