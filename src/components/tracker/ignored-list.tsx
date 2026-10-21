"use client";

import type { JobRow } from "@/types";
import { ago, StageBadge } from "./bits";
import { ExpandableText } from "./expandable-text";
import { JobColumnHeader, JobColumnRow, JobTile } from "./job-column-layout";
import { StageLegend } from "./stage-legend";
import { useJobViewMode } from "./view-mode";

function reason(j: JobRow): string {
  return j.stage === "skipped_by_you" ? "You skipped it" : j.reason || "Did not pass filters";
}

export function IgnoredList({ rows }: { rows: JobRow[] }) {
  const [mode] = useJobViewMode();

  if (mode === "rows") {
    return (
      <div className="space-y-4">
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <JobColumnHeader labels={["Job", "Stage", "Reason", "Posted", "", ""]} />
          {rows.map((j) => (
            <JobColumnRow key={j.id} stage={j.stage}>
              <div className="min-w-0">
                <p className="truncate font-medium">{j.title}</p>
                <p className="truncate text-xs text-muted-foreground">{j.company}</p>
              </div>
              <StageBadge stage={j.stage} />
              <ExpandableText text={reason(j)} max={80} className="max-md:col-span-full" />
              <span className="text-xs text-muted-foreground">{ago(j.postedAt)}</span>
              <span />
              <span />
            </JobColumnRow>
          ))}
        </div>
        <StageLegend />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((j) => (
          <JobTile key={j.id} stage={j.stage}>
            <div className="flex items-start justify-between gap-2">
              <StageBadge stage={j.stage} />
              <span className="text-[10px] text-muted-foreground">{ago(j.postedAt)}</span>
            </div>
            <p className="mt-2 line-clamp-2 font-semibold">{j.title}</p>
            <p className="text-xs text-muted-foreground">{j.company}</p>
            <ExpandableText text={reason(j)} max={100} className="mt-2" />
          </JobTile>
        ))}
      </div>
      <StageLegend />
    </div>
  );
}
