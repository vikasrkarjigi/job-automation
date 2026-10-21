"use client";

import type { JobRow } from "@/types";
import { Badge } from "@/components/ui/badge";
import { StageBadge, when } from "./bits";
import { ContentCard } from "./design";
import { JobSummaryRow, ResumeRowLinks } from "./job-row-card";
import { useJobViewMode } from "./view-mode";

export function ResumeList({ rows }: { rows: JobRow[] }) {
  const [mode] = useJobViewMode();

  if (mode === "rows") {
    return (
      <ContentCard className="overflow-hidden divide-y divide-border">
        {rows.map((j) => (
          <JobSummaryRow
            key={j.id}
            job={j}
            trailing={
              <>
                <span className="text-xs tabular-nums text-muted-foreground">
                  ATS {j.scoreBefore ?? "?"} → {j.scoreAfter ?? "?"}
                </span>
                <ResumeRowLinks jobId={j.id} />
              </>
            }
          />
        ))}
      </ContentCard>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map((j) => (
        <a key={j.id} href={`/resume/${j.id}`} className="group rounded-lg border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-medium group-hover:underline">{j.title}</div>
              <div className="text-xs text-muted-foreground">{j.company}</div>
            </div>
            <StageBadge stage={j.stage} />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="tabular-nums">
              ATS {j.scoreBefore ?? "?"} → {j.scoreAfter ?? "?"}
            </span>
            {(j.analysis?.renames ?? []).slice(0, 2).map((r) => (
              <Badge key={r.from} variant="outline">
                {r.from} → {r.to}
              </Badge>
            ))}
            {j.submittedResumePath && <Badge>Submitted {when(j.submittedAt)}</Badge>}
          </div>
        </a>
      ))}
    </div>
  );
}
