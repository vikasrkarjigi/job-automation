import type { JobRow, Stage, TrackerData } from "../../src/types.ts";
import { counts } from "../../src/tracker.ts";

export const STAGE_LABEL: Record<Stage, string> = {
  ignored: "Ignored",
  scoring: "Scoring",
  needs_confirm: "Keyword question",
  awaiting_approval: "Awaiting your approval",
  skipped_by_you: "Skipped by you",
  approved: "Filling the form",
  apply_blocked: "Apply blocked",
  ready_to_submit: "Ready for your Submit click",
  submitted: "Submitted",
};

export function webUrl(path: string): string | null {
  const base = process.env.SHORTLIST_WEB_URL?.replace(/\/$/, "");
  return base ? `${base}${path}` : null;
}

export function jobSummary(j: JobRow) {
  return {
    id: j.id,
    company: j.company,
    title: j.title,
    location: j.location,
    stage: j.stage,
    stageLabel: STAGE_LABEL[j.stage],
    score: j.scoreBefore === null ? null : `${j.scoreBefore} to ${j.scoreAfter ?? "?"}`,
    reason: j.reason,
    postedAt: j.postedAt,
    links: j.sources.map((s) => s.url),
    resume: j.submittedResumePath ?? j.resumePath,
    resumeView: j.resumePath ? webUrl(`/resume/${j.id}`) : null,
    submittedAt: j.submittedAt,
    people: j.people.length,
  };
}

export function statusOf(data: TrackerData, now = new Date()) {
  const c = counts(data);
  const today = now.toISOString().slice(0, 10);
  const lastRun = data.runs.at(-1) ?? null;
  const pick = (stage: Stage) => data.jobs.filter((j) => j.stage === stage).map(jobSummary);
  return {
    counts: c,
    appliedToday: data.jobs.filter((j) => j.submittedAt?.slice(0, 10) === today).length,
    invitesToday: data.invitesSentByDay[today] ?? 0,
    waitingOnYou: {
      keywordQuestions: data.jobs
        .filter((j) => j.stage === "needs_confirm")
        .map((j) => ({ id: j.id, company: j.company, title: j.title, ask: j.analysis?.needsConfirm ?? [] })),
      approve: pick("awaiting_approval"),
      applyBlocked: pick("apply_blocked"),
      readyToSubmit: pick("ready_to_submit"),
      outreachToSend: data.jobs
        .filter((j) => j.people.some((p) => p.invite === "draft" || p.emailStatus === "draft"))
        .map((j) => ({ id: j.id, company: j.company, drafts: j.people.filter((p) => p.invite === "draft" || p.emailStatus === "draft").length })),
    },
    filling: pick("approved"),
    lastRun,
    tracker: webUrl("/"),
  };
}
