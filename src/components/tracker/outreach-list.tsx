"use client";

import { markPersonSent, sayYesToSend } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { JobRow } from "@/types";
import { CopyButton, SubmitButton } from "./client";
import { ContentCard } from "./design";
import { JobSummaryRow } from "./job-row-card";
import { useJobViewMode } from "./view-mode";

function OutreachJobCards({ job, back }: { job: JobRow; back: string }) {
  const unsent = job.people.some((p) => (p.linkedinUrl && p.invite !== "sent") || p.emailStatus === "draft");
  return (
    <section id={`outreach-${job.id}`} className="scroll-mt-24 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="font-medium">{job.title}</span> <span className="text-muted-foreground">at {job.company}</span>
        </div>
        {unsent && (
          <form action={sayYesToSend}>
            <input type="hidden" name="jobId" value={job.id} />
            <input type="hidden" name="back" value={back} />
            <SubmitButton size="sm" variant="outline">
              Mark all as sent
            </SubmitButton>
          </form>
        )}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {job.people.map((p) => {
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
                  <input type="hidden" name="jobId" value={job.id} />
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
}

export function OutreachList({ jobs, back }: { jobs: JobRow[]; back: string }) {
  const [mode] = useJobViewMode();

  if (mode === "rows") {
    return (
      <ContentCard className="overflow-hidden divide-y divide-border">
        {jobs.map((j) => {
          const pending = j.people.filter((p) => (p.linkedinUrl && p.invite !== "sent") || p.emailStatus === "draft").length;
          return (
            <JobSummaryRow
              key={j.id}
              job={j}
              trailing={
                <>
                  <span className="text-xs text-muted-foreground">
                    {j.people.length} people · {pending} pending
                  </span>
                  <Button size="sm" variant="outline" render={<a href={`#outreach-${j.id}`} />} nativeButton={false}>
                    View drafts
                  </Button>
                </>
              }
            />
          );
        })}
      </ContentCard>
    );
  }

  return (
    <div className="space-y-8">
      {jobs.map((j) => (
        <OutreachJobCards key={j.id} job={j} back={back} />
      ))}
    </div>
  );
}
