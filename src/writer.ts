import fs from "node:fs";
import path from "node:path";
import { isWhyRole, loadAnswers } from "./apply.ts";
import { countTerms } from "./keywords.ts";
import { loadBaseResume, loadConfirmations, loadEvidence } from "./profile.ts";
import { parseResume } from "./resume-view.ts";
import { root } from "./settings.ts";
import { allowedTermsFor } from "./tailor.ts";
import type { JobRow } from "./types.ts";

export const BANNED = [
  "excited to", "thrilled", "passionate about", "leverage", "delve", "tapestry", "synergy", "cutting edge", "cutting-edge",
  "dynamic team", "fast paced", "fast-paced", "in today's", "ever evolving", "ever-evolving", "unique opportunity", "perfect fit",
  "great fit", "aligns perfectly", "align perfectly", "resonates", "testament", "embark", "journey", "furthermore", "moreover",
  "in conclusion", "game changer", "game-changer", "seamless", "robust", "holistic", "spearheaded", "honed", "foster", "realm",
  "landscape", "elevate", "unlock", "empower", "i hope this", "dear hiring manager", "as an ai", "world class", "world-class",
  "industry leader",
];

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

export interface WritingBrief {
  jobId: string;
  question: string;
  company: string;
  title: string;
  words: [number, number];
  posting: string[];
  evidence: { where: string; text: string }[];
  summary: string;
  notes: string;
  allowedSkills: string[];
  style: string;
}

function resumeOf(job: JobRow): string {
  const rel = job.submittedResumePath ?? job.resumePath;
  const file = rel ? path.join(/*turbopackIgnore: true*/ root(), rel) : null;
  return file && fs.existsSync(file) ? fs.readFileSync(file, "utf8") : loadBaseResume();
}

function allowed(job: JobRow): Set<string> {
  const base = loadBaseResume();
  const analysis = job.analysis ?? { renames: [] };
  return allowedTermsFor(base, analysis as NonNullable<JobRow["analysis"]>, loadEvidence(), loadConfirmations());
}

function postingLines(job: JobRow): string[] {
  const terms = new Set((job.analysis?.keywords ?? []).map((k) => k.term));
  const lines = job.description
    .split(/\n+|(?<=[.!?])\s+/)
    .map((l) => l.replace(/^[-*•\s]+/, "").trim())
    .filter((l) => l.length > 30 && l.length < 260);
  const scored = lines.map((l, i) => {
    const hits = [...countTerms(l).keys()].filter((t) => terms.has(t)).length;
    const mission = /\b(we|our|mission|customers?|users?|product|platform|build|building|team)\b/i.test(l) ? 1 : 0;
    return { l, i, s: hits * 2 + mission };
  });
  return scored
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 6)
    .sort((a, b) => a.i - b.i)
    .map((x) => x.l);
}

export function writingBrief(job: JobRow, question: string): WritingBrief {
  const doc = parseResume(resumeOf(job));
  const jobTerms = new Set((job.analysis?.keywords ?? []).map((k) => k.term));
  const evidence: { where: string; text: string; s: number }[] = [];
  let summary = "";
  for (const section of doc.sections) {
    let where = section.title;
    for (const b of section.blocks) {
      if (b.kind === "entry") where = b.parts.slice(0, 2).join(", ");
      if (b.kind === "text" && /summary/i.test(section.title)) summary = b.text;
      if (b.kind === "bullet") {
        const s = [...countTerms(b.text).keys()].filter((t) => jobTerms.has(t)).length;
        evidence.push({ where, text: b.text, s });
      }
    }
  }
  const style = fs.readFileSync(path.join(/*turbopackIgnore: true*/ root(), "agents", "writing-style.md"), "utf8");
  return {
    jobId: job.id,
    question,
    company: job.company,
    title: job.title,
    words: isWhyRole(question) ? [90, 150] : [60, 180],
    posting: postingLines(job),
    evidence: evidence
      .sort((a, b) => b.s - a.s)
      .slice(0, 4)
      .map(({ where, text }) => ({ where, text })),
    summary,
    notes: loadAnswers().get("why_role")?.answer ?? "",
    allowedSkills: [...allowed(job)].sort(),
    style,
  };
}

export interface WritingCheck {
  ok: boolean;
  problems: string[];
  words: number;
}

export function checkWritten(answer: string, question: string, job: JobRow, limit?: number): WritingCheck {
  const problems: string[] = [];
  const text = answer.trim();
  const n = words(text);
  const [min, max] = limit ? [Math.min(20, limit), limit] : isWhyRole(question) ? [90, 150] : [60, 180];
  if (n < min || n > max) problems.push(`${n} words, needs ${min} to ${max}`);
  if (/[—–]|\s-\s|--/.test(text)) problems.push("contains a dash");
  if (text.includes("!")) problems.push("contains an exclamation mark");
  if (/\p{Extended_Pictographic}/u.test(text)) problems.push("contains an emoji");
  const lower = text.toLowerCase();
  const hit = BANNED.filter((p) => lower.includes(p));
  if (hit.length) problems.push(`sounds generated: ${hit.join(", ")}`);
  if (/^i am\b|^i'm\b/i.test(text)) problems.push('opens with "I am"; open with something about the company or the work');
  if (isWhyRole(question) && !lower.includes(job.company.toLowerCase())) problems.push(`does not name ${job.company}`);
  if (!/\d/.test(text)) problems.push("has no concrete result; include one number from the resume");
  const ok = allowed(job);
  const invented = [...countTerms(text).keys()].filter((t) => !ok.has(t));
  if (invented.length) problems.push(`names skills without evidence: ${invented.join(", ")}`);
  return { ok: problems.length === 0, problems, words: n };
}
