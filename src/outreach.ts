import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { paths } from "./settings.ts";
import type { JobRow, Person } from "./types.ts";

export interface PersonInput {
  firstName: string;
  lastName: string;
  role: string;
  company: string;
  source: string;
  linkedinUrl?: string | null;
  email?: string | null;
}

export const NOTE_LIMIT = 300;
const DASHES = /[-‐‑‒–—―]/;

export function messageRole(title: string): string {
  return title.replace(/\s*[-‐‑‒–—―]+\s*/g, ", ").replace(/\s+/g, " ").trim();
}

export function messageCompany(company: string): string {
  return company.replace(/\s*[-‐‑‒–—―]+\s*/g, " ").trim();
}

export function roleRank(role: string): number {
  const r = role.toLowerCase();
  if (/recruit|talent|sourcer|people partner/.test(r)) return 0;
  if (/hiring manager|engineering manager|manager|head of|director|lead/.test(r)) return 1;
  if (/engineer|scientist|developer/.test(r)) return 2;
  return 3;
}

export function pickPeople(input: PersonInput[], limit: number): PersonInput[] {
  const seen = new Set<string>();
  return input
    .filter((p) => p.source === "apollo" || p.source === "vibe")
    .filter((p) => p.firstName?.trim())
    .filter((p) => {
      const k = (p.linkedinUrl || p.email || `${p.firstName} ${p.lastName}`).toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .map((p, i) => ({ p, i }))
    .sort((a, b) => roleRank(a.p.role) - roleRank(b.p.role) || a.i - b.i)
    .slice(0, limit)
    .map(({ p }) => p);
}

export interface MessageCheck {
  ok: boolean;
  errors: string[];
}

export function checkMessage(
  text: string,
  person: { lastName: string },
  role: string,
  company: string,
  limit?: number,
): MessageCheck {
  const errors: string[] = [];
  if (DASHES.test(text)) errors.push("contains a hyphen or dash");
  const last = person.lastName.trim();
  if (last && new RegExp(`\\b${last.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text)) {
    errors.push("uses the last name");
  }
  if (limit !== undefined && text.length >= limit) errors.push(`${text.length} characters, must be under ${limit}`);
  if (!text.toLowerCase().includes(messageRole(role).toLowerCase())) errors.push("does not name the role");
  if (!text.toLowerCase().includes(messageCompany(company).toLowerCase())) errors.push("does not name the company");
  return { ok: errors.length === 0, errors };
}

function skillsPhrase(skills: string[]): string {
  const clean = skills.map((s) => s.replace(DASHES, " "));
  if (clean.length === 0) return "";
  if (clean.length === 1) return clean[0];
  return `${clean.slice(0, -1).join(", ")} and ${clean.at(-1)}`;
}

export function draftNote(person: PersonInput, job: JobRow, skills: string[]): string {
  const role = messageRole(job.title);
  const company = messageCompany(job.company);
  const ask =
    roleRank(person.role) === 0
      ? "Would love to connect and hear how your team is hiring for it."
      : "Would love to connect and learn how your team works.";
  for (let n = Math.min(3, skills.length); n >= 0; n--) {
    const work = n ? ` I build with ${skillsPhrase(skills.slice(0, n))}.` : "";
    const note = `Hi ${person.firstName}, I applied for the ${role} role at ${company}.${work} ${ask}`;
    if (note.length < NOTE_LIMIT) return note;
  }
  return `Hi ${person.firstName}, I applied for the ${role} role at ${company}. Would love to connect.`;
}

export function draftEmail(person: PersonInput, job: JobRow, skills: string[], senderName: string): { subject: string; body: string } {
  const role = messageRole(job.title);
  const company = messageCompany(job.company);
  const work = skills.length ? ` Most of my recent work is with ${skillsPhrase(skills.slice(0, 4))}, which lines up with what the posting asks for.` : "";
  const body = [
    `Hi ${person.firstName},`,
    "",
    `I applied for the ${role} role at ${company} and wanted to reach out directly.${work}`,
    "",
    `If you are the right person for the ${role} search, I would be glad to share more. If not, I would appreciate a pointer to whoever is.`,
    "",
    "Thank you,",
    senderName || "",
  ].join("\n");
  return { subject: `${role} application at ${company}`, body };
}

export function loadPeopleInput(jobId: string): PersonInput[] | null {
  const file = path.join(paths.people(), `${jobId}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function buildPeople(job: JobRow, input: PersonInput[], limit: number, senderName: string): { people: Person[]; rejected: string[] } {
  const skills = job.analysis
    ? job.analysis.keywords.filter((k) => k.tier === "required").map((k) => k.term)
    : [];
  const people: Person[] = [];
  const rejected: string[] = [];
  for (const p of pickPeople(input, limit)) {
    const note = draftNote(p, job, skills);
    const email = draftEmail(p, job, skills, senderName);
    const checks = [
      checkMessage(note, p, job.title, job.company, NOTE_LIMIT),
      checkMessage(`${email.subject}\n${email.body}`, p, job.title, job.company),
    ];
    const errors = checks.flatMap((c) => c.errors);
    if (errors.length) {
      rejected.push(`${p.firstName}: ${errors.join("; ")}`);
      continue;
    }
    people.push({
      id: crypto.createHash("sha1").update(`${job.id}|${p.linkedinUrl ?? p.email ?? p.firstName + p.lastName}`).digest("hex").slice(0, 8),
      firstName: p.firstName.trim(),
      lastName: p.lastName.trim(),
      role: p.role,
      company: p.company,
      source: p.source as Person["source"],
      linkedinUrl: p.linkedinUrl ?? null,
      email: p.email ?? null,
      note,
      emailSubject: email.subject,
      emailBody: email.body,
      gmailDraftId: null,
      invite: "draft",
      emailStatus: p.email ? "draft" : "none",
    });
  }
  return { people, rejected };
}
