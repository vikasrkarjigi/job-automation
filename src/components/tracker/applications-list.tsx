"use client";

import { useState } from "react";
import type { ApplyRunSnapshot } from "@/apply-transparency";
import { applyStatusLine, jobApplyInsight, timelineSteps } from "@/apply-transparency";
import { applicationLinkMeta } from "@/application-url";
import type { JobRow } from "@/types";
import { StageBadge, statusLine } from "./bits";
import { ApplicationActionCell } from "./application-actions";
import { AutoRefresh } from "./client";
import { ContentCard } from "./design";
import { ExpandableText } from "./expandable-text";
import { ApplicationActivityPanel } from "./job-activity";
import { JobColumnHeader, JobColumnRow, JobTile } from "./job-column-layout";
import { ResumeRowLinks } from "./job-row-card";
import { StageLegend } from "./stage-legend";
import { useJobViewMode } from "./view-mode";

const IN_APPLY = new Set<JobRow["stage"]>(["approved", "apply_blocked", "ready_to_submit", "submitted"]);

export function ApplicationsList({ rows, applyRun }: { rows: JobRow[]; applyRun: ApplyRunSnapshot }) {
  const [mode] = useJobViewMode();
  const [expanded, setExpanded] = useState<string | null>(null);

  function statusFor(j: JobRow) {
    return IN_APPLY.has(j.stage) ? applyStatusLine(j, applyRun) : statusLine(j);
  }

  function toggle(j: JobRow) {
    if (!IN_APPLY.has(j.stage)) return;
    setExpanded((id) => (id === j.id ? null : j.id));
  }

  return (
    <div className="space-y-4">
      {applyRun.live && <AutoRefresh every={25} />}
      {mode === "rows" ? (
        <ContentCard className="overflow-hidden">
          <JobColumnHeader labels={["Job", "Stage", "Status", "Score", "Resume", "Action"]} />
          {rows.map((j) => {
            const statusText = statusFor(j);
            const open = expanded === j.id;
            return (
              <div key={j.id}>
                <JobColumnRow stage={j.stage} onClick={IN_APPLY.has(j.stage) ? () => toggle(j) : undefined}>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{j.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {j.company} · {j.location}
                    </p>
                  </div>
                  <StageBadge stage={j.stage} />
                  <ExpandableText text={statusText} max={72} className="max-md:col-span-full" />
                  <p className="text-right text-xs tabular-nums">
                    {j.scoreBefore ?? "?"}→{j.scoreAfter ?? "?"}
                  </p>
                  <div className="text-xs">{j.resumePath ? <ResumeRowLinks jobId={j.id} /> : "—"}</div>
                  <div onClick={(e) => e.stopPropagation()} className="flex justify-end">
                    <ApplicationActionCell job={j} />
                  </div>
                </JobColumnRow>
                {open && IN_APPLY.has(j.stage) && (
                  <div className="border-b border-border bg-muted/25 px-4 py-4 sm:px-5">
                    <ApplicationActivityPanel
                      job={j}
                      insight={jobApplyInsight(j, applyRun)}
                      steps={timelineSteps(j)}
                      statusText={statusText}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </ContentCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((j) => {
            const statusText = statusFor(j);
            const open = expanded === j.id;
            return (
              <JobTile key={j.id} stage={j.stage} onClick={IN_APPLY.has(j.stage) ? () => toggle(j) : undefined}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="line-clamp-2 font-semibold leading-snug">{j.title}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{j.company}</p>
                  </div>
                  <StageBadge stage={j.stage} />
                </div>
                <p className="mt-2 text-xs tabular-nums text-muted-foreground">
                  Score {j.scoreBefore ?? "?"} → {j.scoreAfter ?? "?"}
                </p>
                <ExpandableText text={statusText} max={64} className="mt-2" />
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3" onClick={(e) => e.stopPropagation()}>
                  {j.resumePath && <ResumeRowLinks jobId={j.id} />}
                  <ApplicationActionCell job={j} />
                  {IN_APPLY.has(j.stage) && (
                    <button type="button" className="text-xs font-medium text-primary" onClick={() => toggle(j)}>
                      {open ? "Hide details" : "Details…"}
                    </button>
                  )}
                </div>
                {open && IN_APPLY.has(j.stage) && (
                  <div className="mt-3 border-t border-border pt-3" onClick={(e) => e.stopPropagation()}>
                    <ApplicationActivityPanel
                      job={j}
                      insight={jobApplyInsight(j, applyRun)}
                      steps={timelineSteps(j)}
                      statusText={statusText}
                    />
                  </div>
                )}
              </JobTile>
            );
          })}
        </div>
      )}
      <StageLegend />
    </div>
  );
}
