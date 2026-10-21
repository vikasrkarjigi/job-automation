import {
  answerKeyword,
  approveJob,
  confirmSubmitted,
  skipJob,
} from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { JobRow, Settings } from "@/types";
import { ago, KeywordChips, Score, Sources, statusLine } from "./bits";
import { SubmitButton } from "./client";
import { WrittenAnswers } from "./written";

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

function ShortlistCard({ job, settings }: { job: JobRow; settings: Settings }) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="gap-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-base">{job.title}</CardTitle>
            <JobMeta job={job} />
          </div>
          <Score
            before={job.scoreBefore}
            after={job.scoreAfter}
            target={settings.targetScore}
          />
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
            <SubmitButton pendingLabel="Approving...">
              Approve resume
            </SubmitButton>
          </form>
          <form action={skipJob}>
            <input type="hidden" name="jobId" value={job.id} />
            <SubmitButton variant="outline" pendingLabel="Skipping...">
              Skip
            </SubmitButton>
          </form>
          <Button
            variant="ghost"
            render={
              <a href={`/resume/${job.id}`} target="_blank" rel="noreferrer" />
            }
            nativeButton={false}
          >
            View tailored resume
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function KeywordQuestion({ job }: { job: JobRow }) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="gap-1">
        <CardTitle className="text-base">{job.title}</CardTitle>
        <JobMeta job={job} />
      </CardHeader>
      <CardContent className="space-y-3">
        {(job.analysis?.needsConfirm ?? []).map((term) => (
          <form
            key={term}
            action={answerKeyword}
            className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center"
          >
            <input type="hidden" name="term" value={term} />
            <div className="shrink-0 text-sm sm:w-44">
              Have you used <span className="font-medium">{term}</span>?
            </div>
            <Input
              name="note"
              placeholder="Where you used it, for the evidence note"
              className="flex-1"
            />
            <div className="flex gap-2">
              <SubmitButton name="answer" value="yes" size="sm">
                Yes
              </SubmitButton>
              <SubmitButton
                name="answer"
                value="no"
                size="sm"
                variant="outline"
              >
                No
              </SubmitButton>
            </div>
          </form>
        ))}
        <p className="text-xs text-muted-foreground">
          Asked once. Your answer is remembered and reused on every later job.
        </p>
      </CardContent>
    </Card>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-medium">{title}</h2>
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

export function Today({
  jobs,
  settings,
}: {
  jobs: JobRow[];
  settings: Settings;
}) {
  const questions = jobs.filter((j) => j.stage === "needs_confirm");
  const shortlist = jobs
    .filter((j) => j.stage === "awaiting_approval")
    .sort((a, b) => (b.scoreAfter ?? 0) - (a.scoreAfter ?? 0));
  const ready = jobs.filter((j) => j.stage === "ready_to_submit");
  const filling = jobs.filter(
    (j) => j.stage === "approved" || j.stage === "apply_blocked",
  );

  if (
    !questions.length &&
    !shortlist.length &&
    !ready.length &&
    !filling.length
  ) {
    return (
      <div className="rounded-xl border border-dashed p-10 text-center">
        <p className="font-medium">Nothing is waiting on you.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          The next morning run fetches jobs from the last 24 hours and tailors
          the ones that clear every filter.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {ready.length > 0 && (
        <Section
          title="Ready to submit"
          hint="Every page is filled. Open the form, check it, and press Submit yourself."
        >
          <div className="divide-y rounded-xl border">
            {ready.map((j) => (
              <div key={j.id} className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="font-medium">{j.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {j.company} · uploads the PDF of your tailored resume
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {j.applyPacket && (
                      <Button
                        variant="outline"
                        render={
                          <a
                            href={j.applyPacket.url}
                            target="_blank"
                            rel="noreferrer"
                          />
                        }
                        nativeButton={false}
                      >
                        Open form
                      </Button>
                    )}
                    <form action={confirmSubmitted}>
                      <input type="hidden" name="jobId" value={j.id} />
                      <SubmitButton>I pressed Submit</SubmitButton>
                    </form>
                  </div>
                </div>
                <WrittenAnswers job={j} />
              </div>
            ))}
          </div>
        </Section>
      )}

      {questions.length > 0 && (
        <Section
          title="Keyword questions"
          hint="These jobs clear the bar if you have used the skill. Nothing else in the batch is waiting on them."
        >
          <div className="grid gap-4">
            {questions.map((j) => (
              <KeywordQuestion key={j.id} job={j} />
            ))}
          </div>
        </Section>
      )}

      {shortlist.length > 0 && (
        <Section
          title="Shortlist"
          hint="Title, freshness, years, sponsorship, and agency checks already passed. Approving starts the application and outreach drafts."
        >
          <div className="grid gap-4">
            {shortlist.map((j) => (
              <ShortlistCard key={j.id} job={j} settings={settings} />
            ))}
          </div>
        </Section>
      )}

      {filling.length > 0 && (
        <Section title="Applications in progress">
          <div className="divide-y rounded-xl border">
            {filling.map((j) => (
              <div key={j.id} className="p-4">
                <div className="font-medium">
                  {j.title}{" "}
                  <span className="font-normal text-muted-foreground">
                    at {j.company}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {j.stage === "apply_blocked"
                    ? statusLine(j)
                    : "The apply agent is filling the form. It stops on the Submit page."}
                </div>
                <WrittenAnswers job={j} />
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
