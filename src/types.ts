export type Board = "indeed" | "linkedin" | "jobright";

export interface RawPosting {
  board: Board;
  url: string;
  company: string;
  title: string;
  location: string;
  postedAt: string | null;
  description: string;
}

export type Stage =
  | "ignored"
  | "scoring"
  | "needs_confirm"
  | "awaiting_approval"
  | "skipped_by_you"
  | "approved"
  | "apply_blocked"
  | "ready_to_submit"
  | "submitted";

export type Tier = "required" | "preferred";

export interface JobKeyword {
  term: string;
  tier: Tier;
  weight: number;
  count: number;
}

export interface Rename {
  from: string;
  to: string;
}

export interface ScoreResult {
  split: "headings" | "undivided";
  keywords: JobKeyword[];
  score: number;
  ceiling: number;
  matched: string[];
  unmentioned: string[];
  renames: Rename[];
  needsConfirm: string[];
  gaps: string[];
}

export interface Person {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  company: string;
  source: "apollo" | "vibe";
  linkedinUrl: string | null;
  email: string | null;
  note: string;
  emailSubject: string;
  emailBody: string;
  gmailDraftId: string | null;
  invite: "draft" | "sent" | "held_by_cap";
  emailStatus: "none" | "draft" | "sent";
}

export interface ApplyPacket {
  url: string;
  ats: "workday" | "greenhouse" | "lever" | "other";
  resumePath: string;
  accountEmail: string;
  passwordSecret: string;
  answers: Record<string, string>;
  blockedOn: string | null;
}

export interface HistoryEntry {
  at: string;
  stage: Stage | "drafted" | "sent";
  note: string;
}

export interface JobRow {
  id: string;
  company: string;
  title: string;
  city: string;
  location: string;
  sources: { board: Board; url: string }[];
  postedAt: string;
  description: string;
  stage: Stage;
  filterPassed: boolean;
  reason: string | null;
  analysis: ScoreResult | null;
  scoreBefore: number | null;
  scoreAfter: number | null;
  resumePath: string | null;
  tailorNotes: string[];
  writerModel: string | null;
  approvedAt: string | null;
  applyPacket: ApplyPacket | null;
  submittedAt: string | null;
  submittedResumePath: string | null;
  people: Person[];
  written?: WrittenAnswer[];
  history: HistoryEntry[];
  createdAt: string;
}

export interface WrittenAnswer {
  question: string;
  answer: string;
  at: string;
  by: "agent" | "you";
}

export interface RunRecord {
  id: string;
  kind: "morning" | "approved";
  startedAt: string;
  finishedAt: string | null;
  fetched: number;
  droppedStale: number;
  passedFilters: number;
  shortlisted: number;
  ignored: number;
  needsConfirm: number;
  failed: { jobId: string; step: string; error: string }[];
  note: string;
}

export interface TrackerData {
  jobs: JobRow[];
  runs: RunRecord[];
  invitesSentByDay: Record<string, number>;
  lock: { runId: string; since: string } | null;
}

export interface Settings {
  batchSize: number;
  maxAgeHours: number;
  maxYears: number;
  gateCeiling: number;
  maxAsksPerJob: number;
  targetScore: number;
  preferredWeight: number;
  peoplePerJob: number;
  inviteCapPerDay: number;
  draftTries: number;
}
