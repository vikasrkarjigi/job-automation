"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { passwordMatches, SESSION_COOKIE, sessionToken, validSession } from "@/auth";
import { loadAnswers, saveAnswer } from "@/apply";
import { approve, confirmKeyword, markSent, markSubmitted, runApproved, saveWritten, skip } from "@/orchestrator";
import { runNow } from "@/launcher";
import { describeSchedule, saveSchedule, type RunKind } from "@/schedule";
import { writeState } from "@/store";
import { loadTracker, writeTrackerMarkdown } from "@/tracker";

const field = (form: FormData, name: string) => String(form.get(name) ?? "").trim();
const named = (id: string) => {
  const job = loadTracker().jobs.find((j) => j.id === id);
  return job ? `${job.title} at ${job.company}` : id;
};

function backTo(form: FormData): string {
  const back = field(form, "back");
  return back.startsWith("/") && !back.startsWith("//") ? back : "/";
}

function withNotice(back: string, key: "done" | "error" | "started", message: string): string {
  const url = new URL(back, "http://local");
  for (const k of ["done", "error", "started"]) url.searchParams.delete(k);
  url.searchParams.set(key, message);
  return url.pathname + url.search;
}

/** Server Functions are reachable without the page, so each one checks the session itself. */
async function guard() {
  if (!validSession((await cookies()).get(SESSION_COOKIE)?.value)) redirect("/login");
}

/** `fn` may return a friendlier sentence for the banner than `label`, which is also the commit message. */
async function step(form: FormData, label: string, fn: () => string | void) {
  await guard();
  const back = backTo(form);
  let error: string | null = null;
  try {
    const said = await writeState(label, () => {
      const out = fn();
      writeTrackerMarkdown(loadTracker());
      return out;
    });
    if (said) label = said;
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }
  revalidatePath("/", "layout");
  redirect(withNotice(back, error ? "error" : "done", error ?? label));
}

export async function approveJob(form: FormData) {
  const id = field(form, "jobId");
  await step(form, `Approved ${id}`, () => {
    approve(id);
    runApproved();
    return `Approved ${named(id)}. The apply agent fills the form on its next run`;
  });
}

export async function skipJob(form: FormData) {
  const id = field(form, "jobId");
  await step(form, `Skipped ${id}`, () => {
    skip(id);
    return `Skipped ${named(id)}`;
  });
}

export async function answerKeyword(form: FormData) {
  const term = field(form, "term");
  const answer = form.get("answer") === "yes" ? "yes" : "no";
  if (!term) return;
  await step(form, `Answered ${answer} for ${term}`, () => {
    confirmKeyword(term, answer, field(form, "note"));
  });
}

export async function confirmSubmitted(form: FormData) {
  const id = field(form, "jobId");
  await step(form, `Marked ${id} as submitted`, () => {
    markSubmitted(id);
    return `Marked ${named(id)} as applied`;
  });
}

export async function sayYesToSend(form: FormData) {
  const id = field(form, "jobId");
  await step(form, `Marked outreach for ${id} as sent`, () => {
    const r = markSent(id);
    return `Marked ${r.sent.length + r.emails.length} messages for ${named(id)} as sent${r.heldByCap.length ? `, ${r.heldByCap.length} held by the daily invite cap` : ""}`;
  });
}

export async function markPersonSent(form: FormData) {
  const id = field(form, "jobId");
  const person = field(form, "personId");
  await step(form, `Marked ${person} on ${id} as contacted`, () => {
    const r = markSent(id, [person]);
    const p = loadTracker().jobs.find((j) => j.id === id)?.people.find((x) => x.id === person);
    const who = p ? `${p.firstName} ${p.lastName}`.trim() : "them";
    return r.heldByCap.length ? `Today's invite cap is used up, so ${who} is held for tomorrow` : `Marked ${who} as contacted`;
  });
}

export async function editWritten(form: FormData) {
  const id = field(form, "jobId");
  const question = field(form, "question");
  const answer = String(form.get("answer") ?? "").trim();
  if (!question || !answer) return;
  await step(form, `Edited an answer on ${id}`, () => {
    const check = saveWritten(id, question, answer, "you");
    const note = check.ok ? "" : `. Heads up: ${check.problems.join("; ")}`;
    return `Saved your answer for ${named(id)}${note}`;
  });
}

export async function saveAnswers(form: FormData) {
  await step(form, "Saved your application answers", () => {
    const current = loadAnswers();
    let changed = false;
    for (const [name, value] of form.entries()) {
      if (!name.startsWith("answer:")) continue;
      const key = name.slice("answer:".length);
      const next = String(value).replace(/\s+/g, " ").trim();
      if (current.get(key) && current.get(key)!.answer !== next) {
        saveAnswer(key, next);
        changed = true;
      }
    }
    if (changed && loadTracker().jobs.some((j) => j.stage === "apply_blocked")) runApproved();
  });
}

export async function startAgent(form: FormData) {
  await guard();
  const kind: RunKind = field(form, "kind") === "apply" ? "apply" : "fetch";
  let error: string | null = null;
  try {
    await runNow(kind);
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }
  revalidatePath("/", "layout");
  const said =
    kind === "fetch"
      ? "Started a job search. It usually takes 10 to 25 minutes, and new jobs land on Today when it finishes"
      : "Started filling your approved applications. Each one stops at the Submit button for you";
  redirect(withNotice("/?tab=agents", error ? "error" : "started", error ?? said));
}

export async function updateSchedule(form: FormData) {
  await step(form, "Updated the schedule", () => {
    const s = saveSchedule({
      enabled: form.get("enabled") === "on",
      timezone: field(form, "timezone"),
      times: form.getAll("time").map(String),
      days: form.getAll("day").map(Number),
    });
    return s.enabled && s.times.length && s.days.length ? `Job searches set for ${describeSchedule(s)}` : "Scheduled job searches turned off";
  });
}

export async function login(form: FormData) {
  const next = field(form, "next");
  if (!passwordMatches(field(form, "password"))) {
    redirect(`/login?error=1${next ? `&next=${encodeURIComponent(next)}` : ""}`);
  }
  (await cookies()).set(SESSION_COOKIE, sessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
