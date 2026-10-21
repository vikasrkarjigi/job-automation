"use client";

import { Metric } from "./design";

export function DashboardToolbar({
  metrics,
}: {
  metrics: { waiting: number; ready: number; applied: number; contacted: number; ignored: number };
}) {
  return (
    <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 lg:gap-3">
      <Metric label="Waiting on you" value={metrics.waiting} highlight={metrics.waiting > 0} />
      <Metric label="Ready to submit" value={metrics.ready} highlight={metrics.ready > 0} />
      <Metric label="Applied" value={metrics.applied} />
      <Metric label="Contacted" value={metrics.contacted} />
      <Metric label="Not applied" value={metrics.ignored} className="col-span-2 sm:col-span-1" />
    </div>
  );
}
