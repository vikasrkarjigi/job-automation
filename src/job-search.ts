import type { JobRow, Stage } from "./types.ts";

const STAGE_PHRASE: Record<Stage, string> = {
  ignored: "ignored not applied filtered",
  scoring: "scoring",
  needs_confirm: "keyword confirm question",
  awaiting_approval: "awaiting approval shortlist waiting",
  skipped_by_you: "skipped",
  approved: "approved filling form apply",
  apply_blocked: "blocked apply",
  ready_to_submit: "ready submit",
  submitted: "submitted applied",
};

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(q: string): string[] {
  return norm(q)
    .split(" ")
    .filter((t) => t.length > 0);
}

/** Cheap fuzzy: query token matches field token if equal, substring, or one edit for longer tokens. */
function subsequence(needle: string, hay: string): boolean {
  let i = 0;
  for (const c of hay) {
    if (c === needle[i]) i++;
    if (i === needle.length) return true;
  }
  return false;
}

function tokenMatch(queryTok: string, field: string): boolean {
  if (!queryTok || !field) return false;
  if (field.includes(queryTok) || queryTok.includes(field)) return true;
  if (queryTok.length >= 3 && subsequence(queryTok, field.replace(/\s/g, ""))) return true;
  if (queryTok.length < 4 || field.length < 4) return false;
  const ftoks = field.split(" ");
  for (const f of ftoks) {
    if (f.length < 4) continue;
    if (editDistance(queryTok, f) <= 1) return true;
    if (editDistance(queryTok, f.slice(0, queryTok.length + 1)) <= 1) return true;
  }
  return editDistance(queryTok, field.slice(0, Math.min(field.length, queryTok.length + 2))) <= 1;
}

function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length > 24 || b.length > 24) return 99;
  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i]![0] = i;
  for (let j = 0; j <= b.length; j++) dp[0]![j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(dp[i - 1]![j]! + 1, dp[i]![j - 1]! + 1, dp[i - 1]![j - 1]! + cost);
    }
  }
  return dp[a.length]![b.length]!;
}

export function jobSearchBlob(job: JobRow): string {
  const parts = [
    job.id,
    job.title,
    job.company,
    job.city,
    job.location,
    job.reason ?? "",
    STAGE_PHRASE[job.stage],
    job.stage.replace(/_/g, " "),
    String(job.scoreBefore ?? ""),
    String(job.scoreAfter ?? ""),
    ...job.sources.map((s) => `${s.board} ${s.url}`),
    ...job.people.flatMap((p) => [p.firstName, p.lastName, p.role, p.company, p.email ?? ""]),
    ...(job.analysis?.keywords.map((k) => k.term) ?? []),
  ];
  return norm(parts.join(" "));
}

export function scoreJobSearch(job: JobRow, query: string): number {
  const qtoks = tokens(query);
  if (!qtoks.length) return 1;
  const blob = jobSearchBlob(job);
  const title = norm(job.title);
  const company = norm(job.company);
  let score = 0;
  for (const qt of qtoks) {
    let hit = false;
    if (tokenMatch(qt, title)) {
      score += 12;
      hit = true;
    }
    if (tokenMatch(qt, company)) {
      score += 10;
      hit = true;
    }
    if (tokenMatch(qt, norm(job.id))) {
      score += 14;
      hit = true;
    }
    if (tokenMatch(qt, blob)) {
      score += hit ? 3 : 6;
      hit = true;
    }
    if (!hit) return 0;
  }
  if (norm(job.title).startsWith(norm(qtoks[0]!))) score += 4;
  if (norm(job.company).startsWith(norm(qtoks[0]!))) score += 3;
  return score;
}

export function filterJobsBySearch(jobs: JobRow[], query: string | undefined | null): JobRow[] {
  const q = query?.trim();
  if (!q) return jobs;
  return jobs
    .map((job) => ({ job, score: scoreJobSearch(job, q) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.job.createdAt.localeCompare(a.job.createdAt))
    .map((x) => x.job);
}
