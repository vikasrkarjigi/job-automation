import { markPersonSent, sayYesToSend } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { JobRow, RunRecord } from "@/types";
import { ago, StageBadge, statusLine, when } from "./bits";
import { CopyButton, SubmitButton } from "./client";

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{children}</div>;
}

export function Resumes({ jobs }: { jobs: JobRow[] }) {
  const rows = jobs.filter((j) => j.resumePath).sort((a, b) => (b.submittedAt ?? b.createdAt).localeCompare(a.submittedAt ?? a.createdAt));
  if (!rows.length) return <Empty>No tailored resumes yet. One is written for every job that clears the basic checks.</Empty>;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {rows.map((j) => (
        <a key={j.id} href={`/resume/${j.id}`} className="group rounded-xl border p-4 transition-colors hover:bg-muted/50">
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
  );
}

export function Applications({ jobs }: { jobs: JobRow[] }) {
  const rows = jobs.filter((j) => j.stage !== "ignored").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (!rows.length) return <Empty>No jobs have passed the filters yet. Jobs that failed a check are on the Ignored tab with the reason.</Empty>;
  return (
    <div className="rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Job</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead>Status and reason</TableHead>
            <TableHead className="text-right">Score</TableHead>
            <TableHead>Resume</TableHead>
            <TableHead className="text-right">People</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((j) => (
            <TableRow key={j.id}>
              <TableCell>
                <div className="font-medium">{j.title}</div>
                <div className="text-xs text-muted-foreground">
                  {j.company} · {j.location}
                </div>
              </TableCell>
              <TableCell>
                <StageBadge stage={j.stage} />
              </TableCell>
              <TableCell className="max-w-72 whitespace-normal text-sm">{statusLine(j)}</TableCell>
              <TableCell className="text-right tabular-nums">
                {j.scoreBefore ?? "?"} <span className="text-muted-foreground">to</span> {j.scoreAfter ?? "?"}
              </TableCell>
              <TableCell>
                {j.resumePath ? (
                  <span className="flex gap-2 text-xs">
                    <a className="underline-offset-2 hover:underline" href={`/resume/${j.id}`}>
                      View
                    </a>
                    <a className="underline-offset-2 hover:underline" href={`/resume/${j.id}/pdf`}>
                      PDF
                    </a>
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">not tailored</span>
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums">{j.people.length}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function Outreach({ jobs, back }: { jobs: JobRow[]; back: string }) {
  const withPeople = jobs.filter((j) => j.people.length);
  if (!withPeople.length) {
    return <Empty>No outreach yet. After you approve a job, the outreach agent finds up to five recruiters and managers from Apollo or Vibe and drafts a note for each.</Empty>;
  }
  return (
    <div className="space-y-8">
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
                  <div key={p.id} className="space-y-3 rounded-xl border p-4">
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

export function Ignored({ jobs }: { jobs: JobRow[] }) {
  const rows = jobs.filter((j) => j.stage === "ignored" || j.stage === "skipped_by_you");
  if (!rows.length) return <Empty>Nothing has been ignored yet.</Empty>;
  return (
    <div className="rounded-xl border">
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
    </div>
  );
}

export function Runs({ runs }: { runs: RunRecord[] }) {
  if (!runs.length) return <Empty>No runs yet.</Empty>;
  return (
    <div className="rounded-xl border">
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
    </div>
  );
}
