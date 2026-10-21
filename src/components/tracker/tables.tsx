import { markPersonSent, sayYesToSend } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { JobRow, RunRecord } from "@/types";
import { applyRunSnapshot, applyStatusLine, jobApplyInsight, resolveApplicationUrl, timelineSteps } from "@/apply-transparency";
import { ApplicationActionCell } from "./application-actions";
import type { ApplyRunSnapshot } from "@/apply-transparency";
import type { RunInfo } from "@/cloud";
import type { Launch } from "@/schedule";
import { ago, StageBadge, statusLine, when } from "./bits";
import { AutoRefresh, CopyButton, SubmitButton } from "./client";
import { ContentCard, EmptyState } from "./design";
import { filterJobsBySearch } from "@/job-search";
import { SearchHint } from "./dashboard-search";
import { ApplicationJobRow } from "./job-activity";

function Empty({ title, children }: { title: string; children: React.ReactNode }) {
  return <EmptyState title={title}>{children}</EmptyState>;
}

export function Resumes({ jobs, query }: { jobs: JobRow[]; query?: string }) {
  const all = jobs.filter((j) => j.resumePath).sort((a, b) => (b.submittedAt ?? b.createdAt).localeCompare(a.submittedAt ?? a.createdAt));
  const rows = filterJobsBySearch(all, query);
  if (!all.length) return <Empty title="No tailored resumes">One is written for every job that clears the basic checks.</Empty>;
  if (!rows.length) return <Empty title="No resumes match your search">Try company, city, job title, or part of the job id.</Empty>;
  return (
    <>
      <SearchHint query={query} total={all.length} shown={rows.length} />
      <div className="grid gap-3 sm:grid-cols-2">
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
            {(j.analysis?.renames ?? []).map((r) => (
              <Badge key={r.from} variant="outline">
                {r.from} → {r.to}
              </Badge>
            ))}
            {j.submittedResumePath && <Badge>Submitted {when(j.submittedAt)}</Badge>}
          </div>

        </a>
      ))}
      </div>
    </>
  );
}

export function Applications({ jobs, launches, infos, query }: { jobs: JobRow[]; launches: Launch[]; infos: Map<string, RunInfo>; query?: string }) {
  const all = jobs.filter((j) => j.stage !== "ignored").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const rows = filterJobsBySearch(all, query);
  const applyRun: ApplyRunSnapshot = applyRunSnapshot(launches, infos);
  if (!all.length) return <Empty title="No applications yet">Jobs that fail a check appear under Ignored with the reason.</Empty>;
  if (!rows.length) return <Empty title="No applications match your search">Search matches title, company, city, stage, score, and job id — not exact keywords only.</Empty>;
  return (
    <ContentCard className="overflow-hidden">
      <div className="space-y-0">
      <div className="px-4 pt-3">
      <SearchHint query={query} total={all.length} shown={rows.length} />
      </div>
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
            const cells = (
              <>
                <TableCell>
                  <div className="font-medium">{j.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {j.company} · {j.location}
                  </div>
                  {inApply && <div className="mt-1 text-[10px] text-primary">Tap for activity</div>}
                </TableCell>
                <TableCell>
                  <StageBadge stage={j.stage} />
                </TableCell>
                <TableCell className="max-w-md whitespace-normal text-sm">{statusText}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {j.scoreBefore ?? "?"} <span className="text-muted-foreground">to</span> {j.scoreAfter ?? "?"}
                </TableCell>
                <TableCell>
                  {j.resumePath ? (
                    <span className="flex gap-2 text-xs">
                      <a className="underline-offset-2 hover:underline" href={`/resume/${j.id}`} onClick={(e) => e.stopPropagation()}>
                        View
                      </a>
                      <a className="underline-offset-2 hover:underline" href={`/resume/${j.id}/pdf`} onClick={(e) => e.stopPropagation()}>
                        PDF
                      </a>
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">not tailored</span>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">{j.people.length}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <ApplicationActionCell job={j} url={resolveApplicationUrl(j)} />
                </TableCell>
              </>
            );
            if (!inApply) {
              return <TableRow key={j.id}>{cells}</TableRow>;
            }
            return (
              <ApplicationJobRow
                key={j.id}
                job={j}
                insight={jobApplyInsight(j, applyRun)}
                steps={timelineSteps(j)}
                statusText={statusText}
                rowCells={cells}
              />
            );
          })}
        </TableBody>
      </Table>
      </div>
    </ContentCard>
  );
}

export function Outreach({ jobs, back, query }: { jobs: JobRow[]; back: string; query?: string }) {
  const all = jobs.filter((j) => j.people.length);
  const withPeople = filterJobsBySearch(all, query);
  if (!all.length) {
    return <Empty title="No outreach yet">After you approve a job, the agent finds up to five people from Apollo or Vibe and drafts a note for each.</Empty>;
  }
  if (!withPeople.length) return <Empty title="No outreach matches your search">Try the company or job title.</Empty>;
  return (
    <div className="space-y-8">
      <SearchHint query={query} total={all.length} shown={withPeople.length} />
      {withPeople.map((j) => {
        const unsent = j.people.some((p) => (p.linkedinUrl && p.invite !== "sent") || p.emailStatus === "draft");
        return (
          <section key={j.id} className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-medium">{j.title}</span> <span className="text-muted-foreground">at {j.company}</span>
              </div>
              {unsent && (
                <form action={sayYesToSend}>
                  <input type="hidden" name="jobId" value={j.id} />
                  <input type="hidden" name="back" value={back} />
                  <SubmitButton size="sm" variant="outline">
                    Mark all as sent
                  </SubmitButton>
                </form>
              )}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {j.people.map((p) => {
                const done = (!p.linkedinUrl || p.invite === "sent") && p.emailStatus !== "draft";
                return (
                  <div key={p.id} className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium">
                          {p.firstName} {p.lastName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {p.role} · from {p.source === "apollo" ? "Apollo" : "Vibe"}
                        </div>
                      </div>
                      <Badge variant={p.invite === "sent" ? "default" : p.invite === "held_by_cap" ? "outline" : "secondary"}>
                        {p.invite === "sent" ? "Contacted" : p.invite === "held_by_cap" ? "Held by daily cap" : "Not sent"}
                      </Badge>
                    </div>
                    {p.linkedinUrl && (
                      <div className="space-y-2 rounded-lg bg-muted/50 p-3">
                        <div className="text-xs font-medium text-muted-foreground">LinkedIn note ({p.note.length}/300)</div>
                        <p className="whitespace-pre-wrap text-sm">{p.note}</p>
                        <div className="flex flex-wrap gap-2">
                          <CopyButton text={p.note} label="Copy note" />
                          <Button size="xs" variant="outline" render={<a href={p.linkedinUrl} target="_blank" rel="noreferrer" />} nativeButton={false}>
                            Open LinkedIn profile
                          </Button>
                        </div>
                      </div>
                    )}
                    {p.email && p.emailStatus !== "none" && (
                      <details className="rounded-lg bg-muted/50 p-3 text-sm">
                        <summary className="cursor-pointer select-none text-xs font-medium text-muted-foreground">
                          Email to {p.email} {p.gmailDraftId ? "(saved as a Gmail draft)" : ""}
                        </summary>
                        <p className="mt-2 font-medium">{p.emailSubject}</p>
                        <p className="mt-1 whitespace-pre-wrap">{p.emailBody}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <CopyButton text={`${p.emailSubject}\n\n${p.emailBody}`} label="Copy email" />
                          <Button
                            size="xs"
                            variant="outline"
                            render={<a href={`mailto:${p.email}?subject=${encodeURIComponent(p.emailSubject)}&body=${encodeURIComponent(p.emailBody)}`} />}
                            nativeButton={false}
                          >
                            Open in mail
                          </Button>
                        </div>
                      </details>
                    )}
                    {!done && (
                      <form action={markPersonSent}>
                        <input type="hidden" name="jobId" value={j.id} />
                        <input type="hidden" name="personId" value={p.id} />
                        <input type="hidden" name="back" value={back} />
                        <SubmitButton size="sm">I sent it</SubmitButton>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function Ignored({ jobs, query }: { jobs: JobRow[]; query?: string }) {
  const all = jobs.filter((j) => j.stage === "ignored" || j.stage === "skipped_by_you");
  const rows = filterJobsBySearch(all, query);
  if (!all.length) return <Empty title="Nothing ignored">Jobs you skip or that fail filters will appear here.</Empty>;
  if (!rows.length) return <Empty title="Nothing matches your search">Try company, filter reason, or job title.</Empty>;
  return (
    <ContentCard className="overflow-hidden">
      <SearchHint query={query} total={all.length} shown={rows.length} />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Job</TableHead>
            <TableHead>Why it was dropped</TableHead>
            <TableHead>Posted</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((j) => (
            <TableRow key={j.id}>
              <TableCell>
                <div className="font-medium">{j.title}</div>
                <div className="text-xs text-muted-foreground">{j.company}</div>
              </TableCell>
              <TableCell className="whitespace-normal text-sm">{j.stage === "skipped_by_you" ? "You skipped it" : j.reason}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{ago(j.postedAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ContentCard>
  );
}

export function Runs({ runs }: { runs: RunRecord[] }) {
  if (!runs.length) return <Empty title="No runs logged">Pipeline runs appear here after a job search or approval batch.</Empty>;
  return (
    <ContentCard className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Run</TableHead>
            <TableHead className="text-right">Fetched</TableHead>
            <TableHead className="text-right">Older than 24h</TableHead>
            <TableHead className="text-right">Passed filters</TableHead>
            <TableHead className="text-right">Shortlisted</TableHead>
            <TableHead className="text-right">Ignored</TableHead>
            <TableHead>Failures</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...runs].reverse().map((r) => (
            <TableRow key={r.id}>
              <TableCell>
                <div className="text-sm">{when(r.startedAt)}</div>
                <div className="text-xs text-muted-foreground">{r.kind === "morning" ? r.note || "Morning run" : "After approval"}</div>
              </TableCell>
              <TableCell className="text-right tabular-nums">{r.fetched}</TableCell>
              <TableCell className="text-right tabular-nums">{r.droppedStale}</TableCell>
              <TableCell className="text-right tabular-nums">{r.passedFilters}</TableCell>
              <TableCell className="text-right tabular-nums">{r.shortlisted}</TableCell>
              <TableCell className="text-right tabular-nums">{r.ignored}</TableCell>
              <TableCell className="whitespace-normal text-xs">
                {r.failed.length ? r.failed.map((f) => `${f.jobId}: ${f.error}`).join("; ") : <span className="text-muted-foreground">none</span>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ContentCard>
  );
}
