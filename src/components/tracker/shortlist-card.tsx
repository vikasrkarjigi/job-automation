"use client";

import { approveJob, skipJob } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { JobRow, Settings } from "@/types";
import { ago, KeywordChips, Score, Sources } from "./bits";
import { SubmitButton } from "./client";

function JobMeta({ job }: { job: JobRow }) {
  return (
    <CardDescription className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span>{job.company}</span>
      <span aria-hidden>·</span>
      <span>{job.location}</span>
      <span aria-hidden>·</span>
      <span>posted {ago(job.postedAt)}</span>
      <span aria-hidden>·</span>
      <Sources job={job} />
    </CardDescription>
  );
}

export function ShortlistCardInner({ job, settings }: { job: JobRow; settings: Settings }) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="gap-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-base">{job.title}</CardTitle>
            <JobMeta job={job} />
          </div>
          <Score before={job.scoreBefore} after={job.scoreAfter} target={settings.targetScore} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <KeywordChips job={job} />
        {job.tailorNotes.length > 0 && (
          <ul className="space-y-1 text-sm text-muted-foreground">
            {job.tailorNotes.map((n) => (
              <li key={n}>{n.charAt(0).toUpperCase() + n.slice(1)}.</li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <form action={approveJob}>
            <input type="hidden" name="jobId" value={job.id} />
            <SubmitButton pendingLabel="Approving...">Approve resume</SubmitButton>
          </form>
          <form action={skipJob}>
            <input type="hidden" name="jobId" value={job.id} />
            <SubmitButton variant="outline" pendingLabel="Skipping...">
              Skip
            </SubmitButton>
          </form>
          <Button variant="ghost" render={<a href={`/resume/${job.id}`} target="_blank" rel="noreferrer" />} nativeButton={false}>
            View tailored resume
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
