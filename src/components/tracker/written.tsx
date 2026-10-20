import { editWritten } from "@/app/actions";
import type { JobRow } from "@/types";
import { CopyButton, SubmitButton } from "./client";

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

export function WrittenAnswers({ job, back = "/" }: { job: JobRow; back?: string }) {
  const written = job.written ?? [];
  if (!written.length) return null;
  return (
    <details className="mt-3 rounded-lg border bg-muted/30 p-3">
      <summary className="cursor-pointer select-none text-sm font-medium">
        Answers written for this application ({written.length})
        <span className="ml-2 font-normal text-muted-foreground">Read them before you press Submit</span>
      </summary>
      <div className="mt-3 space-y-4">
        {written.map((w) => (
          <div key={w.question} className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">{w.question}</p>
              <span className="text-xs text-muted-foreground">
                {words(w.answer)} words · {w.by === "you" ? "edited by you" : "written from your resume"}
              </span>
            </div>
            <form action={editWritten} className="space-y-2">
              <input type="hidden" name="jobId" value={job.id} />
              <input type="hidden" name="question" value={w.question} />
              <input type="hidden" name="back" value={back} />
              <textarea
                name="answer"
                defaultValue={w.answer}
                rows={Math.min(10, Math.max(4, Math.ceil(w.answer.length / 90)))}
                className="w-full rounded-lg border border-input bg-background px-2.5 py-2 text-sm leading-relaxed outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
              <div className="flex gap-2">
                <CopyButton text={w.answer} label="Copy answer" />
                <SubmitButton size="xs" variant="outline">
                  Save my edit
                </SubmitButton>
              </div>
            </form>
          </div>
        ))}
      </div>
    </details>
  );
}
