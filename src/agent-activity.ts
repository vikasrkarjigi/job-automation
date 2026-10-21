import type { HistoryEntry, JobRow, TrackerData } from "./types.ts";

export type AgentId = "scout" | "ats" | "tailor" | "apply" | "outreach" | "tracker";

export interface Activity {
  at: string;
  jobId: string;
  job: string;
  note: string;
}

export interface AgentSummary {
  id: AgentId;
  name: string;
  role: string;
  stats: { label: string; value: number | string }[];
  waitingOnYou: number;
  recent: Activity[];
}

/** Which agent wrote a history entry. The first entry on a job is always the scout's filter decision. */
export function agentFor(entry: HistoryEntry, index: number): AgentId {
  if (index === 0) return "scout";
  switch (entry.stage) {
    case "ignored":
    case "scoring":
    case "needs_confirm":
      return "ats";
    case "awaiting_approval":
      return "tailor";
    case "apply_blocked":
    case "ready_to_submit":
      return "apply";
    case "approved":
      return entry.note.startsWith("you ") ? "tracker" : "apply";
    case "drafted":
      return entry.note.includes("outreach") ? "outreach" : "apply";
    case "sent":
      return "outreach";
    default:
      return "tracker";
  }
}

const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);

export function agentSummaries(data: TrackerData, recentCount = 4): AgentSummary[] {
  const jobs = data.jobs;
  const by = (f: (j: JobRow) => boolean) => jobs.filter(f).length;
  const people = jobs.flatMap((j) => j.people);
  const scored = jobs.filter((j) => j.scoreBefore !== null && j.scoreAfter !== null);
  const lastSearch = data.runs.filter((r) => r.kind === "morning").at(-1);

  const recent = new Map<AgentId, Activity[]>();
  for (const job of jobs) {
    job.history.forEach((h, i) => {
      const id = agentFor(h, i);
      const list = recent.get(id) ?? [];
      list.push({ at: h.at, jobId: job.id, job: `${job.title} at ${job.company}`, note: h.note });
      recent.set(id, list);
    });
  }
  const latest = (id: AgentId) => (recent.get(id) ?? []).sort((a, b) => b.at.localeCompare(a.at)).slice(0, recentCount);

  const before = avg(scored.map((j) => j.scoreBefore!));
  const after = avg(scored.map((j) => j.scoreAfter!));

  return [
    {
      id: "scout",
      name: "Scout",
      role: "Finds AI engineer roles posted in the last 24 hours on Indeed, LinkedIn, and Jobright, and drops any that fail your hard filters.",
      stats: [
        { label: "Jobs found", value: jobs.length },
        { label: "Passed filters", value: by((j) => j.filterPassed) },
        { label: "Last search fetched", value: lastSearch ? lastSearch.fetched : "none yet" },
      ],
      waitingOnYou: 0,
      recent: latest("scout"),
    },
    {
      id: "ats",
      name: "ATS scorer",
      role: "Scores each job against your resume the way an applicant tracking system would, and asks you about keywords it cannot prove.",
      stats: [
        { label: "Scored", value: scored.length },
        { label: "Average before", value: before ?? "none" },
        { label: "Keyword questions", value: by((j) => j.stage === "needs_confirm") },
      ],
      waitingOnYou: by((j) => j.stage === "needs_confirm"),
      recent: latest("ats"),
    },
    {
      id: "tailor",
      name: "Resume tailor",
      role: "Rewrites your resume for each job using only what you have actually done, then rescores it.",
      stats: [
        { label: "Resumes tailored", value: by((j) => !!j.resumePath) },
        { label: "Average after", value: after ?? "none" },
        { label: "Awaiting approval", value: by((j) => j.stage === "awaiting_approval") },
      ],
      waitingOnYou: by((j) => j.stage === "awaiting_approval"),
      recent: latest("tailor"),
    },
    {
      id: "apply",
      name: "Apply",
      role: "Fills each approved application up to the Submit button, using your saved answers and a fresh written answer for open questions.",
      stats: [
        { label: "Approved, to fill", value: by((j) => j.stage === "approved") },
        { label: "Ready to submit", value: by((j) => j.stage === "ready_to_submit") },
        { label: "Blocked", value: by((j) => j.stage === "apply_blocked") },
      ],
      waitingOnYou: by((j) => j.stage === "ready_to_submit" || j.stage === "apply_blocked"),
      recent: latest("apply"),
    },
    {
      id: "outreach",
      name: "Outreach",
      role: "Drafts short notes to recruiters and hiring managers found through Apollo or Vibe. Nothing is sent until you say yes.",
      stats: [
        { label: "People found", value: people.length },
        { label: "Drafts waiting", value: people.filter((p) => p.invite !== "sent").length },
        { label: "Contacted", value: people.filter((p) => p.invite === "sent").length },
      ],
      waitingOnYou: people.filter((p) => p.invite === "draft").length,
      recent: latest("outreach"),
    },
    {
      id: "tracker",
      name: "Tracker",
      role: "Records every decision and keeps the Excel sheet and this dashboard in sync with the repository.",
      stats: [
        { label: "Applied", value: by((j) => j.stage === "submitted") },
        { label: "Skipped by you", value: by((j) => j.stage === "skipped_by_you") },
        { label: "Runs logged", value: data.runs.length },
      ],
      waitingOnYou: 0,
      recent: latest("tracker"),
    },
  ];
}
