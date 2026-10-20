import { saveAnswers } from "@/app/actions";
import { Input } from "@/components/ui/input";
import type { SavedAnswer } from "@/apply";
import { SubmitButton } from "./client";

const LONG = new Set(["why_role"]);
const FIXED = new Set(["password_secret"]);

export function Answers({ sections, back }: { sections: { title: string; answers: SavedAnswer[] }[]; back: string }) {
  const blanks = sections.flatMap((s) => s.answers).filter((a) => !a.answer && !FIXED.has(a.key)).length;
  return (
    <form action={saveAnswers} className="space-y-8">
      <input type="hidden" name="back" value={back} />
      <div className="flex flex-col gap-3 rounded-xl border bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm">
          {blanks > 0 ? (
            <>
              <span className="font-medium">{blanks} blank.</span> The apply agent never guesses, so a form that asks one of these stops and waits for you.
            </>
          ) : (
            "Every question has an answer. The apply agent fills forms from these."
          )}
        </p>
        <SubmitButton>Save answers</SubmitButton>
      </div>
      {sections.map((s) => (
        <section key={s.title} className="space-y-3">
          <h2 className="text-sm font-medium">{s.title === "Saved answers" ? "Application answers" : s.title}</h2>
          <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            {s.answers.map((a) => (
              <label key={a.key} className={`space-y-1.5 ${LONG.has(a.key) ? "sm:col-span-2" : ""}`}>
                <span className="flex items-center gap-2 text-sm">
                  {a.question}
                  {!a.answer && !FIXED.has(a.key) && <span className="rounded bg-amber-100 px-1.5 text-[11px] font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">blank</span>}
                </span>
                {LONG.has(a.key) ? (
                  <textarea
                    name={`answer:${a.key}`}
                    defaultValue={a.answer}
                    rows={3}
                    className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  />
                ) : (
                  <Input name={`answer:${a.key}`} defaultValue={a.answer} readOnly={FIXED.has(a.key)} />
                )}
              </label>
            ))}
          </div>
        </section>
      ))}
      <div className="flex justify-end">
        <SubmitButton>Save answers</SubmitButton>
      </div>
    </form>
  );
}
