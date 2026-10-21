import { ACTIVE, type RunInfo } from "./cloud.ts";
import type { Launch } from "./schedule.ts";
import type { HistoryEntry, JobRow, Stage } from "./types.ts";

export interface ApplyRunSnapshot {
  live: boolean;
  url: string | null;
  startedAt: string | null;
  status: string | null;
}

const STALE_MS = 2 * 3_600_000;

const STAGE_NOTE: Partial<Record<Stage | HistoryEntry["stage"], string>> = {
  approved: "You approved the resume",
  apply_blocked: "Apply stopped — needs you",
  ready_to_submit: "Form filled — press Submit in the browser",
  submitted: "Marked submitted",
  drafted: "Outreach or written answer",
  sent: "Outreach sent",
  awaiting_approval: "Resume tailored — waiting for approve/skip",
  needs_confirm: "Keyword confirmation",
  ignored: "Filtered out",
  skipped_by_you: "You skipped",
};

export function resolveApplicationUrl(job: JobRow): string | null {
  return job.applyPacket?.url ?? job.sources[0]?.url ?? null;
}

export function lastActivityAt(job: JobRow): string {
  return job.history.at(-1)?.at ?? job.approvedAt ?? job.createdAt;
}

export function isApplyStale(job: JobRow, now = new Date()): boolean {
  if (job.stage !== "approved") return false;
  return now.getTime() - Date.parse(lastActivityAt(job)) > STALE_MS;
}

export function timelineSteps(job: JobRow, max = 12): { at: string; title: string; note: string }[] {
  return job.history.slice(-max).map((h) => ({
    at: h.at,
    title: STAGE_NOTE[h.stage] ?? String(h.stage).replace(/_/g, " "),
    note: h.note,
  }));
}

export interface JobApplyInsight {
  summary: string;
  hint: string | null;
  stale: boolean;
  canWatchAgent: boolean;
  agentWatchUrl: string | null;
  applicationUrl: string | null;
  packetReady: boolean;
  answersReady: number;
  answersTotal: number;
  blockedOn: string | null;
  writtenCount: number;
}

export function jobApplyInsight(job: JobRow, applyRun: ApplyRunSnapshot, now = new Date()): JobApplyInsight {
  const packet = job.applyPacket;
  const applicationUrl = resolveApplicationUrl(job);
  const answersTotal = packet ? Object.keys(packet.answers).length : 0;
  const answersReady = packet ? Object.values(packet.answers).filter((v) => v.trim()).length : 0;
  const blockedOn = packet?.blockedOn ?? (job.stage === "apply_blocked" ? job.reason : null);
  const writtenCount = job.written?.length ?? 0;
  const stale = isApplyStale(job, now);
  const canWatchAgent = applyRun.live && job.stage === "approved";
  const agentWatchUrl = canWatchAgent ? applyRun.url : null;

  let summary: string;
  let hint: string | null = null;

  switch (job.stage) {
    case "approved":
      if (applyRun.live) {
        summary = "Apply cloud agent is running now";
        hint = "Open Watch in Cursor to see the browser session. This page updates when the agent saves progress to GitHub.";
      } else if (stale) {
        summary = "No updates in over 2 hours";
        hint = "Go to Agents → Fill approved applications to start (or restart) the apply agent.";
      } else {
        summary = "Approved — waiting for the apply agent";
        hint = "Nothing is filling the form until you start Fill approved applications on the Agents tab (or a scheduled apply run).";
      }
      break;
    case "apply_blocked":
      summary = "Apply paused — needs your input";
      hint = blockedOn ? readableBlock(blockedOn) : "Fix the issue below, then run Fill approved applications again.";
      break;
    case "ready_to_submit":
      summary = "Form filled — ready for your Submit click";
      hint = applicationUrl ? "Open the application URL and press Submit when everything looks correct." : null;
      break;
    case "submitted":
      summary = "Submitted";
      hint = null;
      break;
    default:
      summary = "Not in the apply pipeline yet";
      hint = null;
  }

  return {
    summary,
    hint,
    stale,
    canWatchAgent,
    agentWatchUrl,
    applicationUrl,
    packetReady: !!packet,
    answersReady,
    answersTotal,
    blockedOn,
    writtenCount,
  };
}

function readableBlock(blockedOn: string): string {
  const blanks = blockedOn.match(/^blank in apply\.md: (.+)$/);
  if (blanks) {
    const keys = blanks[1].split(",").map((k) => k.trim().replace(/_/g, " "));
    return `Fill ${keys.join(", ")} on My answers, then run Fill approved applications again.`;
  }
  return blockedOn;
}

/** Short line for the applications table. */
export function applyRunSnapshot(launches: Launch[], infos: Map<string, RunInfo>): ApplyRunSnapshot {
  const last = [...launches].reverse().find((l) => l.kind === "apply");
  if (!last) return { live: false, url: null, startedAt: null, status: null };
  const info = last.runId ? infos.get(last.runId) : undefined;
  return {
    live: !!info && ACTIVE.includes(info.status),
    url: last.url,
    startedAt: last.at,
    status: info?.status ?? null,
  };
}

export function applyStatusLine(job: JobRow, applyRun: ApplyRunSnapshot, now = new Date()): string {
  const i = jobApplyInsight(job, applyRun, now);
  if (job.stage === "awaiting_approval") return "Waiting on you: approve or skip the tailored resume";
  if (job.stage === "needs_confirm") return `Waiting on you: have you used ${(job.analysis?.needsConfirm ?? []).join(", ")}?`;
  if (job.stage === "ignored") return job.reason ? `Not applied: ${job.reason}` : "Not applied";
  if (job.stage === "skipped_by_you") return "Not applied: you skipped it";
  if (job.stage === "submitted") {
    return `Applied ${job.submittedAt ? new Date(job.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}`.trim();
  }
  return i.hint ? `${i.summary}. ${i.hint}` : i.summary;
}
