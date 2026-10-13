import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { answerFor, appendQuestion, buildPacket, loadAnswers } from "./apply.ts";
import { gate, scoreJob } from "./ats.ts";
import { buildPeople, loadPeopleInput } from "./outreach.ts";
import { loadBaseResume, loadConfirmations, loadEvidence, recordConfirmation } from "./profile.ts";
import { boardCursors, dedupe, hardFilter, industryFor, isFresh, loadCompanies, pagesToFetch, readInbox } from "./scout.ts";
import { loadSettings, paths } from "./settings.ts";
import { rememberLink } from "./skill-families.ts";
import { tailorResume } from "./tailor.ts";
import { addHistory, dayKey, findJob, jobId, jobKey, loadTracker, saveTracker, setStage } from "./tracker.ts";
import type { Board, JobRow, RunRecord, Settings, TrackerData } from "./types.ts";

const LOCK_TTL_MS = 2 * 3_600_000;

export interface MorningSummary {
  status: "done" | "locked";
  runId: string;
  day: string;
  passedToday: number;
  batchSize: number;
  needMore: boolean;
  nextPages: { board: Board; page: number }[];
  shortlist: { id: string; company: string; title: string; scoreBefore: number | null; scoreAfter: number | null }[];
  needsConfirm: { id: string; company: string; title: string; keywords: string[] }[];
  run: RunRecord | null;
}

function newRun(kind: RunRecord["kind"], now: Date): RunRecord {
  return {
    id: `${kind}-${now.toISOString()}-${crypto.randomBytes(2).toString("hex")}`,
    kind,
    startedAt: now.toISOString(),
    finishedAt: null,
    fetched: 0,
    droppedStale: 0,
    passedFilters: 0,
    shortlisted: 0,
    ignored: 0,
    needsConfirm: 0,
    failed: [],
    note: "",
  };
}

function writeResume(id: string, tex: string): string {
  fs.mkdirSync(paths.resumes(), { recursive: true });
  const rel = path.join("resumes", `${id}.tex`);
  fs.writeFileSync(path.join(paths.resumes(), `${id}.tex`), tex);
  return rel;
}

export function evaluateJob(job: JobRow, settings: Settings, now = new Date()): void {
  const base = loadBaseResume();
  const evidence = loadEvidence();
  const confirmations = loadConfirmations();
  const ctx = { evidence, confirmations, preferredWeight: settings.preferredWeight };

  const analysis = scoreJob(job.description, base, ctx);
  job.analysis = analysis;
  job.scoreBefore = analysis.score;

  const decision = gate(analysis, settings);
  if (decision.decision === "ignore") {
    job.reason = decision.reason;
    setStage(job, "ignored", decision.reason, now);
    return;
  }
  if (decision.decision === "confirm") {
    job.reason = `asks once: ${decision.keywords.join(", ")}`;
    if (job.stage !== "needs_confirm") setStage(job, "needs_confirm", job.reason, now);
    return;
  }

  const result = tailorResume(base, analysis, evidence, confirmations);
  if (result.missingRequired.length) {
    job.reason = `could not place required: ${result.missingRequired.join(", ")}`;
    setStage(job, "ignored", job.reason, now);
    return;
  }
  for (const r of analysis.renames) rememberLink(r.from, r.to, job.id);
  job.resumePath = writeResume(job.id, result.tex);
  job.tailorNotes = result.notes;
  job.scoreAfter = scoreJob(job.description, result.tex, ctx).score;
  job.reason = null;
  const target = job.scoreAfter >= settings.targetScore ? "at target" : `honest result, target is ${settings.targetScore}`;
  setStage(job, "awaiting_approval", `tailored ${job.scoreBefore} to ${job.scoreAfter}, ${target}`, now);
}

function passedOn(data: TrackerData, day: string): number {
  return data.jobs.filter((j) => j.filterPassed && j.createdAt.slice(0, 10) === day).length;
}

function evaluatePendingJobs(data: TrackerData, run: RunRecord, settings: Settings, now: Date): void {
  for (const job of data.jobs.filter((j) => j.stage === "scoring" || j.stage === "needs_confirm")) {
    try {
      evaluateJob(job, settings, now);
      if (job.stage === "awaiting_approval") run.shortlisted++;
      if (job.stage === "ignored") run.ignored++;
      if (job.stage === "needs_confirm") run.needsConfirm++;
    } catch (err) {
      run.failed.push({ jobId: job.id, step: "score and tailor", error: String((err as Error).message ?? err) });
    }
    saveTracker(data);
  }
}

export function runMorning(opts: { now?: Date } = {}): MorningSummary {
  const now = opts.now ?? new Date();
  const settings = loadSettings();
  const day = dayKey(now);
  const data = loadTracker();
  const run = newRun("morning", now);

  if (data.lock && now.getTime() - Date.parse(data.lock.since) < LOCK_TTL_MS) {
    return { ...summarize(data, day, settings, []), status: "locked", runId: data.lock.runId, run: null };
  }
  data.lock = { runId: run.id, since: now.toISOString() };
  data.runs.push(run);
  saveTracker(data);

  let pages: ReturnType<typeof readInbox> = [];
  try {
    pages = readInbox(day);
    const all = pages.flatMap((p) => p.postings);
    run.fetched = all.length;
    const fresh = all.filter((p) => isFresh(p.postedAt, now, settings.maxAgeHours));
    run.droppedStale = all.length - fresh.length;
    const merged = dedupe(fresh).sort((a, b) => (b.postedAt ?? "").localeCompare(a.postedAt ?? ""));
    const companies = loadCompanies();
    const byKey = new Map(data.jobs.map((j) => [jobKey(j.company, j.title, j.location), j]));

    for (const m of merged) {
      const existing = byKey.get(m.key);
      if (existing) {
        for (const s of m.sources) if (!existing.sources.some((e) => e.url === s.url)) existing.sources.push(s);
        continue;
      }
      if (passedOn(data, day) >= settings.batchSize) break;
      const reason = hardFilter(m, industryFor(companies, m.company), settings);
      const job: JobRow = {
        id: jobId(m.company, m.title, m.location),
        company: m.company,
        title: m.title,
        city: m.city,
        location: m.location,
        sources: m.sources,
        postedAt: m.postedAt!,
        description: m.description,
        stage: reason ? "ignored" : "scoring",
        filterPassed: !reason,
        reason,
        analysis: null,
        scoreBefore: null,
        scoreAfter: null,
        resumePath: null,
        tailorNotes: [],
        writerModel: process.env.SHORTLIST_WRITER_MODEL ?? null,
        approvedAt: null,
        applyPacket: null,
        submittedAt: null,
        submittedResumePath: null,
        people: [],
        history: [{ at: now.toISOString(), stage: reason ? "ignored" : "scoring", note: reason ?? "passed every hard filter" }],
        createdAt: now.toISOString(),
      };
      data.jobs.push(job);
      byKey.set(m.key, job);
      if (reason) run.ignored++;
      else run.passedFilters++;
    }
    saveTracker(data);
    evaluatePendingJobs(data, run, settings, now);
  } finally {
    run.finishedAt = new Date().toISOString();
    data.lock = null;
    saveTracker(data);
  }
  return { ...summarize(data, day, settings, pages), status: "done", runId: run.id, run };
}

function summarize(data: TrackerData, day: string, settings: Settings, pages: ReturnType<typeof readInbox>) {
  const passedToday = passedOn(data, day);
  const nextPages = passedToday < settings.batchSize ? pagesToFetch(boardCursors(pages)) : [];
  return {
    day,
    passedToday,
    batchSize: settings.batchSize,
    needMore: nextPages.length > 0,
    nextPages,
    shortlist: data.jobs
      .filter((j) => j.stage === "awaiting_approval")
      .map((j) => ({ id: j.id, company: j.company, title: j.title, scoreBefore: j.scoreBefore, scoreAfter: j.scoreAfter })),
    needsConfirm: data.jobs
      .filter((j) => j.stage === "needs_confirm")
      .map((j) => ({ id: j.id, company: j.company, title: j.title, keywords: j.analysis?.needsConfirm ?? [] })),
  };
}

export function confirmKeyword(term: string, answer: "yes" | "no", note = "", now = new Date()): RunRecord {
  recordConfirmation(term, answer, note);
  const data = loadTracker();
  const run = newRun("morning", now);
  run.note = `re-evaluated after ${term}: ${answer}`;
  data.runs.push(run);
  evaluatePendingJobs(data, run, loadSettings(), now);
  run.finishedAt = new Date().toISOString();
  saveTracker(data);
  return run;
}

export function approve(id: string, now = new Date()): JobRow {
  const data = loadTracker();
  const job = findJob(data, id);
  if (job.stage !== "awaiting_approval") throw new Error(`${id} is ${job.stage}, not awaiting approval`);
  job.approvedAt = now.toISOString();
  setStage(job, "approved", "you approved the tailored resume", now);
  saveTracker(data);
  return job;
}

export function skip(id: string, now = new Date()): JobRow {
  const data = loadTracker();
  const job = findJob(data, id);
  if (job.stage !== "awaiting_approval") throw new Error(`${id} is ${job.stage}, not awaiting approval`);
  setStage(job, "skipped_by_you", "you skipped this job", now);
  saveTracker(data);
  return job;
}

export interface ApprovedSummary {
  jobs: { id: string; stage: string; packet: boolean; people: number; note: string }[];
}

export function runApproved(opts: { now?: Date } = {}): ApprovedSummary {
  const now = opts.now ?? new Date();
  const settings = loadSettings();
  const data = loadTracker();
  const run = newRun("approved", now);
  data.runs.push(run);
  const answers = loadAnswers();
  const sender = answers.get("preferred_name")?.answer || answers.get("legal_name")?.answer.split(" ")[0] || "";
  const out: ApprovedSummary["jobs"] = [];

  for (const job of data.jobs.filter((j) => ["approved", "apply_blocked", "ready_to_submit"].includes(j.stage))) {
    const notes: string[] = [];
    try {
      if (!job.applyPacket || job.stage === "apply_blocked") {
        job.applyPacket = buildPacket(job, answers);
        if (job.applyPacket.blockedOn) {
          if (job.stage !== "apply_blocked" || job.reason !== job.applyPacket.blockedOn) {
            setStage(job, "apply_blocked", job.applyPacket.blockedOn, now);
          }
          job.reason = job.applyPacket.blockedOn;
        } else if (job.stage === "apply_blocked") {
          job.reason = null;
          setStage(job, "approved", "apply packet ready, blanks filled", now);
        }
        notes.push(job.applyPacket.blockedOn ?? "apply packet ready");
      }
      if (job.people.length === 0) {
        const input = loadPeopleInput(job.id);
        if (!input) {
          notes.push(`waiting for people in data/people/${job.id}.json`);
        } else {
          const { people, rejected } = buildPeople(job, input, settings.peoplePerJob, sender);
          job.people = people;
          addHistory(job, "drafted", `${people.length} outreach drafts${rejected.length ? `, rejected ${rejected.join(" | ")}` : ""}`, now);
          notes.push(`${people.length} outreach drafts`);
        }
      }
    } catch (err) {
      run.failed.push({ jobId: job.id, step: "apply and outreach", error: String((err as Error).message ?? err) });
    }
    out.push({ id: job.id, stage: job.stage, packet: !!job.applyPacket, people: job.people.length, note: notes.join("; ") });
    saveTracker(data);
  }
  run.finishedAt = new Date().toISOString();
  saveTracker(data);
  return { jobs: out };
}

export function answerQuestion(id: string, question: string, now = new Date()): { ok: boolean; answer?: string; reason?: string } {
  const data = loadTracker();
  const job = findJob(data, id);
  const result = answerFor(question, loadAnswers());
  if (result.ok) return { ok: true, answer: result.answer };
  if (result.key.startsWith("custom_")) appendQuestion(question);
  const reason = `${question}: ${result.reason}`;
  job.reason = reason;
  setStage(job, "apply_blocked", reason, now);
  saveTracker(data);
  return { ok: false, reason };
}

export function markBlocked(id: string, reason: string, now = new Date()): JobRow {
  const data = loadTracker();
  const job = findJob(data, id);
  job.reason = reason;
  setStage(job, "apply_blocked", reason, now);
  saveTracker(data);
  return job;
}

export function markReady(id: string, now = new Date()): JobRow {
  const data = loadTracker();
  const job = findJob(data, id);
  if (!["approved", "apply_blocked"].includes(job.stage)) throw new Error(`${id} is ${job.stage}, it must be approved first`);
  job.reason = null;
  setStage(job, "ready_to_submit", "every page filled, waiting on your Submit click", now);
  saveTracker(data);
  return job;
}

export function markSubmitted(id: string, now = new Date()): JobRow {
  const data = loadTracker();
  const job = findJob(data, id);
  if (job.stage !== "ready_to_submit") throw new Error(`${id} is ${job.stage}, not ready to submit`);
  job.submittedAt = now.toISOString();
  job.submittedResumePath = job.resumePath;
  setStage(job, "submitted", `you pressed Submit with ${job.resumePath}`, now);
  saveTracker(data);
  return job;
}

export function recordGmailDraft(id: string, personId: string, draftId: string): void {
  const data = loadTracker();
  const person = findJob(data, id).people.find((p) => p.id === personId);
  if (!person) throw new Error(`No person ${personId} on ${id}`);
  person.gmailDraftId = draftId;
  saveTracker(data);
}

export function markSent(id: string, personIds: string[] = [], now = new Date()): { sent: string[]; heldByCap: string[]; emails: string[] } {
  const settings = loadSettings();
  const data = loadTracker();
  const job = findJob(data, id);
  const today = dayKey(now);
  const chosen = job.people.filter((p) => personIds.length === 0 || personIds.includes(p.id));
  const sent: string[] = [];
  const heldByCap: string[] = [];
  const emails: string[] = [];
  for (const p of chosen) {
    if (p.linkedinUrl && p.invite !== "sent") {
      const used = data.invitesSentByDay[today] ?? 0;
      if (used < settings.inviteCapPerDay) {
        p.invite = "sent";
        data.invitesSentByDay[today] = used + 1;
        sent.push(p.id);
      } else {
        p.invite = "held_by_cap";
        heldByCap.push(p.id);
      }
    }
    if (p.emailStatus === "draft") {
      p.emailStatus = "sent";
      emails.push(p.id);
    }
  }
  addHistory(job, "sent", `you said yes: ${sent.length} invites, ${emails.length} emails, ${heldByCap.length} held by the daily cap`, now);
  saveTracker(data);
  return { sent, heldByCap, emails };
}
