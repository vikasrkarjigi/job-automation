"use client";

import { useState } from "react";
import type { JobApplyInsight } from "@/apply-transparency";
import type { JobRow } from "@/types";
import { ago, when } from "./bits";
import { TableRow, TableCell } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { ApplicationUrlChip, GoSubmitButton, ReadyToSubmitPanel } from "./application-actions";

export function ApplicationJobRow({
  job,
  insight,
  steps,
  statusText,
  rowCells,
}: {
  job: JobRow;
  insight: JobApplyInsight;
  steps: { at: string; title: string; note: string }[];
  statusText: string;
  rowCells: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const showDetail = ["approved", "apply_blocked", "ready_to_submit", "submitted"].includes(job.stage);

  return (
    <>
      <TableRow
        className={cn(showDetail && "cursor-pointer hover:bg-muted/40", open && "bg-muted/30")}
        onClick={() => showDetail && setOpen((v) => !v)}
      >
        {rowCells}
      </TableRow>
      {open && showDetail && (
        <TableRow className="bg-muted/20 hover:bg-muted/20">
          <TableCell colSpan={7} className="p-4 sm:p-5">
            <JobActivityDetail job={job} insight={insight} steps={steps} statusText={statusText} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function JobActivityDetail({
  job,
  insight,
  steps,
  statusText,
}: {
  job: JobRow;
  insight: JobApplyInsight;
  steps: { at: string; title: string; note: string }[];
  statusText: string;
}) {
  const url = insight.applicationUrl;

  return (
    <div className="space-y-4 text-sm">
      {job.stage === "ready_to_submit" && url && (
        <ReadyToSubmitPanel jobId={job.id} url={url} title={job.title} company={job.company} />
      )}

      {url && job.stage !== "ready_to_submit" && (
        <ApplicationUrlChip url={url} onClick={(e) => e.stopPropagation()} />
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-foreground">{insight.summary}</p>
          <p className="mt-1 max-w-3xl text-muted-foreground">{statusText}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {insight.agentWatchUrl && (
            <a
              href={insight.agentWatchUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              Watch in Cursor
            </a>
          )}
          {url && job.stage !== "ready_to_submit" && (
            <GoSubmitButton url={url} size="sm" label="Open application" onClick={(e) => e.stopPropagation()} />
          )}
        </div>
      </div>

      {insight.stale && (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-amber-950 dark:text-amber-100" role="status">
          This job has not changed in over 2 hours. The apply agent is probably not running — start <strong>Fill approved applications</strong> on the Agents tab.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Apply checklist</p>
          <ul className="mt-2 space-y-1.5">
            <Check ok={!!job.approvedAt} label={`Approved ${job.approvedAt ? ago(job.approvedAt) : ""}`} />
            <Check ok={insight.packetReady} label={insight.packetReady ? `Apply packet built (${insight.answersReady}/${insight.answersTotal} saved answers)` : "Apply packet — built when the apply agent runs npm run approved"} />
            <Check ok={job.stage === "ready_to_submit" || job.stage === "submitted"} label="Form filled in browser (agent stops at Submit)" />
            <Check ok={job.stage === "submitted"} label="You pressed Submit" />
            {insight.blockedOn && (
              <li className="text-destructive">
                Blocked: {insight.blockedOn.replace(/^blank in apply\.md: /, "Missing answers: ")}
              </li>
            )}
            {insight.writtenCount > 0 && <li className="text-muted-foreground">{insight.writtenCount} custom written answer(s) saved</li>}
          </ul>
        </div>

        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Activity log</p>
          <ol className="mt-2 max-h-48 space-y-2 overflow-y-auto">
            {steps.map((s, i) => (
              <li key={`${s.at}-${i}`} className="border-l-2 border-primary/30 pl-3">
                <span className="text-xs text-muted-foreground">{when(s.at)}</span>
                <p className="font-medium">{s.title}</p>
                <p className="text-muted-foreground">{s.note}</p>
              </li>
            ))}
          </ol>
          <p className="mt-2 text-xs text-muted-foreground">Last update {ago(lastActivity(job))}. Refresh this page after the agent commits to GitHub.</p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Live typing in the application form is not streamed here — the cloud agent runs in Cursor. Use <strong>Watch in Cursor</strong> while a run is active, or check this log after each run finishes.
      </p>
    </div>
  );
}

function lastActivity(job: JobRow): string {
  return job.history.at(-1)?.at ?? job.approvedAt ?? job.createdAt;
}

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className={ok ? "text-foreground" : "text-muted-foreground"}>
      <span aria-hidden>{ok ? "✓ " : "○ "}</span>
      {label}
    </li>
  );
}
