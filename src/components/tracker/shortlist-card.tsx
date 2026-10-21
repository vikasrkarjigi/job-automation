"use client";

import { approveJob, skipJob } from "@/app/actions";
import { Button } from "@/components/ui/button";
import type { JobRow, Settings } from "@/types";
import { ago, Score, Sources, StageBadge } from "./bits";
import { SubmitButton } from "./client";
import { CollapsibleKeywordChips } from "./collapsible-keywords";
import { JobTile } from "./job-column-layout";

function JobMeta({ job }: { job: JobRow }) {
  return (
    <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
      <span>{job.company}</span>
      <span aria-hidden>·</span>
      <span className="truncate">{job.location}</span>
      <span aria-hidden>·</span>
      <span>{ago(job.postedAt)}</span>
      <Sources job={job} />
    </p>
  );
}

export function ShortlistCardInner({ job, settings }: { job: JobRow; settings: Settings }) {
  return (
    <JobTile stage="awaiting_approval" className="h-full min-h-[14rem]">
      <div className="flex items-start justify-between gap-2">
        <StageBadge stage={job.stage} />
        <Score before={job.scoreBefore} after={job.scoreAfter} target={settings.targetScore} />
      </div>
      <h3 className="mt-2 line-clamp-2 text-base font-semibold leading-snug">{job.title}</h3>
      <JobMeta job={job} />
      <div className="mt-3">
        <CollapsibleKeywordChips job={job} />
      </div>
      <div className="mt-auto flex flex-wrap gap-2 pt-4">
        <form action={approveJob}>
          <input type="hidden" name="jobId" value={job.id} />
          <SubmitButton size="sm" pendingLabel="…">
            Approve
          </SubmitButton>
        </form>
        <form action={skipJob}>
          <input type="hidden" name="jobId" value={job.id} />
          <SubmitButton size="sm" variant="outline" pendingLabel="…">
            Skip
          </SubmitButton>
        </form>
        <Button size="sm" variant="ghost" render={<a href={`/resume/${job.id}`} target="_blank" rel="noreferrer" />} nativeButton={false}>
          Resume
        </Button>
      </div>
    </JobTile>
  );
}
