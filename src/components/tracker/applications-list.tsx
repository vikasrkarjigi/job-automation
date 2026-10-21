"use client";

import type { ApplyRunSnapshot } from "@/apply-transparency";
import { applyStatusLine, jobApplyInsight, resolveApplicationUrl, timelineSteps } from "@/apply-transparency";
import type { JobRow } from "@/types";
import { statusLine } from "./bits";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApplicationActionCell } from "./application-actions";
import { AutoRefresh } from "./client";
import { ContentCard } from "./design";
import { ApplicationJobRow } from "./job-activity";
import { JobSummaryRow } from "./job-row-card";
import { StageBadge } from "./bits";
import { useJobViewMode } from "./view-mode";

export function ApplicationsList({ rows, applyRun }: { rows: JobRow[]; applyRun: ApplyRunSnapshot }) {
  const [mode] = useJobViewMode();

  if (mode === "rows") {
    return (
      <ContentCard className="overflow-hidden">
        {applyRun.live && <AutoRefresh every={25} />}
        <div className="divide-y divide-border">
          {rows.map((j) => {
            const inApply = ["approved", "apply_blocked", "ready_to_submit", "submitted"].includes(j.stage);
            const statusText = inApply ? applyStatusLine(j, applyRun) : statusLine(j);
            return (
              <JobSummaryRow
                key={j.id}
                job={j}
                trailing={
                  <>
                    <span className="max-w-[14rem] truncate text-xs text-muted-foreground sm:max-w-xs">{statusText}</span>
                    <span className="text-xs tabular-nums">
                      {j.scoreBefore ?? "?"} → {j.scoreAfter ?? "?"}
                    </span>
                    <ApplicationActionCell job={j} url={resolveApplicationUrl(j)} />
                  </>
                }
              />
            );
          })}
        </div>
      </ContentCard>
    );
  }

  return (
    <ContentCard className="overflow-hidden">
      {applyRun.live && <AutoRefresh every={25} />}
      <p className="border-b border-border px-4 py-2 text-xs text-muted-foreground">
        Click a job in <strong>Filling form</strong>, <strong>Blocked</strong>, or <strong>Ready to submit</strong> to see activity, checklist, and links.
        {applyRun.live && " Apply agent is running — this table auto-refreshes."}
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Job</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead>Status and reason</TableHead>
            <TableHead className="text-right">Score</TableHead>
            <TableHead>Resume</TableHead>
            <TableHead className="text-right">People</TableHead>
            <TableHead>Submit</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((j) => {
            const inApply = ["approved", "apply_blocked", "ready_to_submit", "submitted"].includes(j.stage);
            const statusText = inApply ? applyStatusLine(j, applyRun) : statusLine(j);
            if (!inApply) {
              return (
                <TableRow key={j.id}>
                  <ApplicationCells job={j} statusText={statusText} />
                </TableRow>
              );
            }
            return (
              <ApplicationJobRow
                key={j.id}
                job={j}
                insight={jobApplyInsight(j, applyRun)}
                steps={timelineSteps(j)}
                statusText={statusText}
              />
            );
          })}
        </TableBody>
      </Table>
    </ContentCard>
  );
}

function ApplicationCells({ job, statusText }: { job: JobRow; statusText: string }) {
  const inApply = ["approved", "apply_blocked", "ready_to_submit", "submitted"].includes(job.stage);
  return (
    <>
      <TableCell>
        <div className="font-medium">{job.title}</div>
        <div className="text-xs text-muted-foreground">
          {job.company} · {job.location}
        </div>
        {inApply && <div className="mt-1 text-[10px] text-primary">Tap for activity</div>}
      </TableCell>
      <TableCell>
        <StageBadge stage={job.stage} />
      </TableCell>
      <TableCell className="max-w-md whitespace-normal text-sm">{statusText}</TableCell>
      <TableCell className="text-right tabular-nums">
        {job.scoreBefore ?? "?"} <span className="text-muted-foreground">to</span> {job.scoreAfter ?? "?"}
      </TableCell>
      <TableCell>
        {job.resumePath ? (
          <span className="flex gap-2 text-xs">
            <a className="underline-offset-2 hover:underline" href={`/resume/${job.id}`}>
              View
            </a>
            <a className="underline-offset-2 hover:underline" href={`/resume/${job.id}/pdf`}>
              PDF
            </a>
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">not tailored</span>
        )}
      </TableCell>
      <TableCell className="text-right tabular-nums">{job.people.length}</TableCell>
      <TableCell>
        <ApplicationActionCell job={job} url={resolveApplicationUrl(job)} />
      </TableCell>
    </>
  );
}
