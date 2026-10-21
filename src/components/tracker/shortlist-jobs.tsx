"use client";

import { approveJob, skipJob } from "@/app/actions";
import type { JobRow, Settings } from "@/types";
import { StageBadge } from "./bits";
import { SubmitButton } from "./client";
import { JobColumnHeader, JobColumnRow } from "./job-column-layout";
import { ResumeRowLinks } from "./job-row-card";
import { ShortlistCardInner } from "./shortlist-card";
import { StageLegend } from "./stage-legend";
import { useJobViewMode } from "./view-mode";

export function ShortlistJobs({ jobs, settings }: { jobs: JobRow[]; settings: Settings }) {
  const [mode] = useJobViewMode();

  if (mode === "rows") {
    return (
      <div className="space-y-4">
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <JobColumnHeader labels={["Job", "Stage", "Score", "Actions", "Resume", ""]} />
          {jobs.map((j) => (
            <JobColumnRow key={j.id} stage={j.stage}>
              <div className="min-w-0">
                <p className="truncate font-medium">{j.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {j.company} · {j.location}
                </p>
              </div>
              <StageBadge stage={j.stage} />
              <p className="text-right text-sm font-semibold tabular-nums">{j.scoreAfter ?? "?"}</p>
              <div className="flex flex-wrap gap-1">
                <form action={approveJob}>
                  <input type="hidden" name="jobId" value={j.id} />
                  <SubmitButton size="xs" pendingLabel="…">
                    Approve
                  </SubmitButton>
                </form>
                <form action={skipJob}>
                  <input type="hidden" name="jobId" value={j.id} />
                  <SubmitButton size="xs" variant="outline" pendingLabel="…">
                    Skip
                  </SubmitButton>
                </form>
              </div>
              <ResumeRowLinks jobId={j.id} />
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
        {jobs.map((j) => (
          <ShortlistCardInner key={j.id} job={j} settings={settings} />
        ))}
      </div>
      <StageLegend />
    </div>
  );
}
