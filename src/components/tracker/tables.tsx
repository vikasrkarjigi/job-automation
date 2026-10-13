import { sayYesToSend } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { JobRow, RunRecord } from "@/types";
import { ago, StageBadge, when } from "./bits";

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
          <div className="mt-2 font-mono text-[11px] text-muted-foreground">{j.submittedResumePath ?? j.resumePath}</div>
        </a>
      ))}
    </div>
  );
}

export function Applications({ jobs }: { jobs: JobRow[] }) {
  const rows = jobs.filter((j) => j.stage !== "ignored");
  if (!rows.length) return <Empty>No jobs have passed the filters yet.</Empty>;
  return (
    <div className="rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Job</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead className="text-right">Score</TableHead>
            <TableHead>Resume the recruiter sees</TableHead>
            <TableHead>Submitted</TableHead>
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
              <TableCell className="text-right tabular-nums">
                {j.scoreBefore ?? "?"} <span className="text-muted-foreground">to</span> {j.scoreAfter ?? "?"}
              </TableCell>
              <TableCell>
                {j.resumePath ? (
                  <a className="font-mono text-xs underline-offset-2 hover:underline" href={`/resume/${j.id}`} target="_blank" rel="noreferrer">
                    {j.submittedResumePath ?? j.resumePath}
                  </a>
                ) : (
                  <span className="text-xs text-muted-foreground">not tailored</span>
                )}
              </TableCell>
              <TableCell className="text-sm">{when(j.submittedAt) || <span className="text-muted-foreground">no</span>}</TableCell>
              <TableCell className="text-right tabular-nums">{j.people.length}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function People({ jobs }: { jobs: JobRow[] }) {
  const withPeople = jobs.filter((j) => j.people.length);
  if (!withPeople.length) return <Empty>No outreach yet. People are drafted after you approve a job.</Empty>;
  return (
    <div className="space-y-6">
      {withPeople.map((j) => {
        const unsent = j.people.some((p) => (p.linkedinUrl && p.invite !== "sent") || p.emailStatus === "draft");
        return (
          <section key={j.id} className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-medium">{j.title}</span> <span className="text-muted-foreground">at {j.company}</span>
              </div>
              {unsent && (
                <form action={sayYesToSend}>
                  <input type="hidden" name="jobId" value={j.id} />
                  <Button type="submit" size="sm">
                    Yes, send these
                  </Button>
                </form>
              )}
            </div>
            <div className="rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>LinkedIn invite</TableHead>
                    <TableHead>Email</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {j.people.map((p) => (
                    <TableRow key={p.id} className="align-top">
                      <TableCell>
                        <div className="font-medium">{p.firstName}</div>
                        <details className="mt-1 max-w-xs text-xs text-muted-foreground">
                          <summary className="cursor-pointer select-none">Drafts</summary>
                          <p className="mt-1 whitespace-pre-wrap">{p.note}</p>
                          <p className="mt-2 font-medium text-foreground">{p.emailSubject}</p>
                          <p className="whitespace-pre-wrap">{p.emailBody}</p>
                        </details>
                      </TableCell>
                      <TableCell className="max-w-48 whitespace-normal text-sm">{p.role}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{p.source === "apollo" ? "Apollo" : "Vibe"}</Badge>
                      </TableCell>
                      <TableCell className="space-y-0.5 text-xs">
                        {p.linkedinUrl && (
                          <a className="block underline-offset-2 hover:underline" href={p.linkedinUrl} target="_blank" rel="noreferrer">
                            LinkedIn
                          </a>
                        )}
                        {p.email && <div className="text-muted-foreground">{p.email}</div>}
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.invite === "sent" ? "default" : "secondary"}>
                          {p.invite === "sent" ? "Sent" : p.invite === "held_by_cap" ? "Held by daily cap" : "Draft"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.emailStatus === "sent" ? "default" : p.emailStatus === "none" ? "outline" : "secondary"}>
                          {p.emailStatus === "sent" ? "Sent" : p.emailStatus === "none" ? "No email" : p.gmailDraftId ? "Gmail draft" : "Draft"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
