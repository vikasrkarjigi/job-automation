"use client";

import type { JobRow } from "@/types";
import { ago } from "./bits";
import { ContentCard } from "./design";
import { JobSummaryRow } from "./job-row-card";
import { useJobViewMode } from "./view-mode";

export function IgnoredList({ rows }: { rows: JobRow[] }) {
  const [mode] = useJobViewMode();

  if (mode === "rows") {
    return (
      <ContentCard className="overflow-hidden divide-y divide-border">
        {rows.map((j) => (
          <JobSummaryRow
            key={j.id}
            job={j}
            trailing={
              <span className="max-w-md text-right text-xs text-muted-foreground">
                {j.stage === "skipped_by_you" ? "You skipped it" : j.reason}
              </span>
            }
          />
        ))}
      </ContentCard>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {rows.map((j) => (
        <div key={j.id} className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <p className="font-medium">{j.title}</p>
          <p className="text-sm text-muted-foreground">{j.company}</p>
          <p className="mt-2 text-sm">{j.stage === "skipped_by_you" ? "You skipped it" : j.reason}</p>
          <p className="mt-2 text-xs text-muted-foreground">Posted {ago(j.postedAt)}</p>
        </div>
      ))}
    </div>
  );
}
