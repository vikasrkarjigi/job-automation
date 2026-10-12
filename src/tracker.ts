import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { paths } from "./settings";
import type { HistoryEntry, JobRow, Stage, TrackerData } from "./types";

export function emptyTracker(): TrackerData {
  return { jobs: [], runs: [], invitesSentByDay: {}, lock: null };
}

export function loadTracker(): TrackerData {
  const file = paths.tracker();
  if (!fs.existsSync(file)) return emptyTracker();
  return { ...emptyTracker(), ...JSON.parse(fs.readFileSync(file, "utf8")) };
}

export function saveTracker(data: TrackerData): void {
  const file = paths.tracker();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + "\n");
  fs.renameSync(tmp, file);
  writeTrackerMarkdown(data);
}

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b(inc|llc|ltd|corp|corporation|co|company|the)\b\.?/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function cityOf(location: string): string {
  return normalize(location.split(",")[0] ?? location);
}

export function jobKey(company: string, title: string, location: string): string {
  return `${normalize(company)}|${normalize(title)}|${cityOf(location)}`;
}

export function jobId(company: string, title: string, location: string): string {
  const key = jobKey(company, title, location);
  const slug = `${normalize(company)}-${normalize(title)}`.replace(/\s+/g, "-").slice(0, 48);
  const hash = crypto.createHash("sha1").update(key).digest("hex").slice(0, 6);
  return `${slug}-${hash}`;
}

export function setStage(job: JobRow, stage: Stage, note: string, at = new Date()): void {
  job.stage = stage;
  job.history.push({ at: at.toISOString(), stage, note });
}

export function addHistory(job: JobRow, stage: HistoryEntry["stage"], note: string, at = new Date()): void {
  job.history.push({ at: at.toISOString(), stage, note });
}

export function findJob(data: TrackerData, id: string): JobRow {
  const job = data.jobs.find((j) => j.id === id);
  if (!job) throw new Error(`No job with id ${id}`);
  return job;
}

export function dayKey(at = new Date()): string {
  return at.toISOString().slice(0, 10);
}

export interface TrackerCounts {
  fetched: number;
  shortlisted: number;
  needsConfirm: number;
  readyToSubmit: number;
  applied: number;
  ignored: number;
  people: number;
  invitesSent: number;
  draftsWaiting: number;
}

export function counts(data: TrackerData): TrackerCounts {
  const people = data.jobs.flatMap((j) => j.people);
  return {
    fetched: data.jobs.length,
    shortlisted: data.jobs.filter((j) => j.stage === "awaiting_approval").length,
    needsConfirm: data.jobs.filter((j) => j.stage === "needs_confirm").length,
    readyToSubmit: data.jobs.filter((j) => j.stage === "ready_to_submit").length,
    applied: data.jobs.filter((j) => j.stage === "submitted").length,
    ignored: data.jobs.filter((j) => j.stage === "ignored").length,
    people: people.length,
    invitesSent: people.filter((p) => p.invite === "sent").length,
    draftsWaiting: people.filter((p) => p.invite !== "sent" || p.emailStatus === "draft").length,
  };
}

const cell = (s: string | number | null | undefined) =>
  String(s ?? "").replace(/\|/g, "/").replace(/\n/g, " ");

export function renderTrackerMarkdown(data: TrackerData): string {
  const c = counts(data);
  const lines: string[] = [
    "# Application tracker",
    "",
    "Generated from data/tracker.json after every stage change. Do not edit by hand.",
    "",
    `Applied: ${c.applied}. Ready to submit: ${c.readyToSubmit}. Awaiting your approval: ${c.shortlisted}. Waiting on a keyword answer: ${c.needsConfirm}. Ignored: ${c.ignored}.`,
    `People found: ${c.people}. LinkedIn invites sent: ${c.invitesSent}.`,
    "",
    "## Applications",
    "",
    "| Job | Company | Stage | Score before | Score after | Resume the recruiter saw | Submitted |",
    "| --- | --- | --- | --- | --- | --- | --- |",
  ];
  for (const j of data.jobs.filter((j) => j.stage !== "ignored")) {
    lines.push(
      `| ${cell(j.title)} | ${cell(j.company)} | ${cell(j.stage)} | ${cell(j.scoreBefore)} | ${cell(j.scoreAfter)} | ${cell(j.submittedResumePath ?? j.resumePath)} | ${cell(j.submittedAt)} |`,
    );
  }
  lines.push("", "## People", "", "| First name | Role | Company | Job | Source | LinkedIn | Email | Invite | Email status |", "| --- | --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const j of data.jobs) {
    for (const p of j.people) {
      lines.push(
        `| ${cell(p.firstName)} | ${cell(p.role)} | ${cell(p.company)} | ${cell(j.title)} | ${cell(p.source)} | ${cell(p.linkedinUrl)} | ${cell(p.email)} | ${cell(p.invite)} | ${cell(p.emailStatus)} |`,
      );
    }
  }
  lines.push("", "## Ignored", "", "| Job | Company | Reason |", "| --- | --- | --- |");
  for (const j of data.jobs.filter((j) => j.stage === "ignored")) {
    lines.push(`| ${cell(j.title)} | ${cell(j.company)} | ${cell(j.reason)} |`);
  }
  return lines.join("\n") + "\n";
}

export function writeTrackerMarkdown(data: TrackerData): void {
  const file = paths.trackerMd();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, renderTrackerMarkdown(data));
}
