"use client";

import { Suspense } from "react";
import type { DeskTab } from "./dashboard-layout";
import { Metric } from "./design";
import { DashboardSearch } from "./dashboard-search";
import { ViewModeToggle } from "./view-mode";

const VIEW_TABS: DeskTab[] = ["today", "applications", "resumes", "outreach", "ignored"];

export function DashboardToolbar({
  tab,
  metrics,
}: {
  tab: DeskTab;
  metrics: { waiting: number; ready: number; applied: number; contacted: number; ignored: number };
}) {
  const showViewToggle = VIEW_TABS.includes(tab);

  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-stretch sm:justify-between">
      <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto rounded-lg border border-border bg-card/60 px-2 py-2 sm:gap-2">
        <Metric compact label="Waiting on you" value={metrics.waiting} highlight={metrics.waiting > 0} className="min-w-[5.5rem]" />
        <Metric compact label="Ready to submit" value={metrics.ready} highlight={metrics.ready > 0} className="min-w-[5.5rem]" />
        <Metric compact label="Applied" value={metrics.applied} className="min-w-[4.5rem]" />
        <Metric compact label="Contacted" value={metrics.contacted} className="min-w-[4.5rem]" />
        <Metric compact label="Not applied" value={metrics.ignored} className="min-w-[4.5rem]" />
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:max-w-sm">
        <Suspense fallback={<div className="h-9 w-full min-w-[11rem] rounded-md bg-muted sm:w-44" aria-hidden />}>
          <DashboardSearch variant="compact" className="w-full sm:w-44" />
        </Suspense>
        {showViewToggle && <ViewModeToggle />}
      </div>
    </div>
  );
}
