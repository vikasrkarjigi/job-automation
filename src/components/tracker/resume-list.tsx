"use client";

import type { JobRow } from "@/types";
import { StageBadge, when } from "./bits";
import { Badge } from "@/components/ui/badge";
import { JobColumnHeader, JobColumnRow, JobTile } from "./job-column-layout";
import { ResumeRowLinks } from "./job-row-card";
import { StageLegend } from "./stage-legend";
import { useJobViewMode } from "./view-mode";

export function ResumeList({ rows }: { rows: JobRow[] }) {
  const [mode] = useJobViewMode();

  if (mode === "rows") {
    return (
      <div className="space-y-4">
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <JobColumnHeader labels={["Job", "Stage", "Score", "Resume", "Submitted", ""]} />
          {rows.map((j) => (
            <JobColumnRow key={j.id} stage={j.stage}>
              <div className="min-w-0">
                <p className="truncate font-medium">{j.title}</p>
                <p className="truncate text-xs text-muted-foreground">{j.company}</p>
              </div>
              <StageBadge stage={j.stage} />
              <p className="text-right text-sm tabular-nums">
                {j.scoreBefore ?? "?"}→{j.scoreAfter ?? "?"}
              </p>
              <ResumeRowLinks jobId={j.id} />
              <span className="text-xs text-muted-foreground">{j.submittedAt ? when(j.submittedAt) : "—"}</span>
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
          <JobTile key={j.id} stage={j.stage} className="h-full">
            <div className="flex items-start justify-between gap-2">
              <StageBadge stage={j.stage} />
              <p className="text-sm font-semibold tabular-nums">
                {j.scoreBefore ?? "?"} → {j.scoreAfter ?? "?"}
              </p>
            </div>
            <a href={`/resume/${j.id}`} className="mt-2 line-clamp-2 font-semibold leading-snug hover:underline">
              {j.title}
            </a>
            <p className="text-xs text-muted-foreground">{j.company}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {(j.analysis?.renames ?? []).slice(0, 2).map((r) => (
                <Badge key={r.from} variant="outline" className="text-[10px]">
                  {r.from} → {r.to}
                </Badge>
              ))}
            </div>
            <div className="mt-auto flex gap-2 border-t border-border pt-3">
              <ResumeRowLinks jobId={j.id} />
            </div>
          </JobTile>
        ))}
      </div>
      <StageLegend />
    </div>
  );
}
