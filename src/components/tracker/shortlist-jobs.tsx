"use client";

import { approveJob, skipJob } from "@/app/actions";
import { Button } from "@/components/ui/button";
import type { JobRow, Settings } from "@/types";
import { KeywordChips, Score } from "./bits";
import { SubmitButton } from "./client";
import { ContentCard } from "./design";
import { JobSummaryRow } from "./job-row-card";
import { useJobViewMode } from "./view-mode";
import { ShortlistCardInner } from "./shortlist-card";

export function ShortlistJobs({ jobs, settings }: { jobs: JobRow[]; settings: Settings }) {
  const [mode] = useJobViewMode();

  if (mode === "rows") {
    return (
      <ContentCard className="overflow-hidden divide-y divide-border">
        {jobs.map((j) => (
          <JobSummaryRow
            key={j.id}
            job={j}
            trailing={
              <>
                <Score before={j.scoreBefore} after={j.scoreAfter} target={settings.targetScore} />
                <form action={approveJob}>
                  <input type="hidden" name="jobId" value={j.id} />
                  <SubmitButton size="sm" pendingLabel="…">
                    Approve
                  </SubmitButton>
                </form>
                <form action={skipJob}>
                  <input type="hidden" name="jobId" value={j.id} />
                  <SubmitButton size="sm" variant="outline" pendingLabel="…">
                    Skip
                  </SubmitButton>
                </form>
                <Button size="sm" variant="ghost" render={<a href={`/resume/${j.id}`} target="_blank" rel="noreferrer" />} nativeButton={false}>
                  Resume
                </Button>
              </>
            }
          />
        ))}
      </ContentCard>
    );
  }

  return (
    <div className="grid gap-4">
      {jobs.map((j) => (
        <ShortlistCardInner key={j.id} job={j} settings={settings} />
      ))}
    </div>
  );
}
