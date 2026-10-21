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
  const showMetrics = tab === "today";
  const showViewToggle = VIEW_TABS.includes(tab);

  return (
    <div className="mb-6 space-y-3">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Suspense fallback={<div className="h-9 w-44 rounded-md bg-muted" aria-hidden />}>
          <DashboardSearch variant="compact" />
        </Suspense>
        {showViewToggle && <ViewModeToggle />}
      </div>
      {showMetrics && (
        <div className="flex gap-2 overflow-x-auto rounded-lg border border-border bg-card/50 px-2 py-2">
          <Metric label="Waiting on you" value={metrics.waiting} highlight={metrics.waiting > 0} />
          <Metric label="Ready to submit" value={metrics.ready} highlight={metrics.ready > 0} />
          <Metric label="Applied" value={metrics.applied} />
          <Metric label="Contacted" value={metrics.contacted} />
          <Metric label="Not applied" value={metrics.ignored} />
        </div>
      )}
    </div>
  );
}
