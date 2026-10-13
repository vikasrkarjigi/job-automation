import fs from "node:fs";
import path from "node:path";
import { splitSections } from "./sections.ts";
import { paths } from "./settings.ts";
import { cityOf, jobKey, normalize } from "./tracker.ts";
import type { Board, RawPosting, Settings } from "./types.ts";

export const BOARDS: Board[] = ["indeed", "linkedin", "jobright"];

const TITLE_PATTERNS = [
  "ai engineer",
  "ai ml engineer",
  "software engineer ai ml",
  "software engineer ai",
  "software engineer machine learning",
  "applied ai engineer",
  "machine learning engineer",
  "llm engineer",
  "generative ai engineer",
  "gen ai engineer",
  "genai engineer",
];

const TITLE_EXCLUDES =
  /\b(senior|sr|staff|principal|lead|manager|director|head|vp|vice president|research scientist|product manager|intern|internship)\b/;

export function checkTitle(title: string): string | null {
  const t = normalize(title);
  if (TITLE_EXCLUDES.test(t)) return `title is out of scope: ${title}`;
  if (!TITLE_PATTERNS.some((p) => ` ${t} `.includes(` ${p} `))) return `title is not an AI engineer role: ${title}`;
  return null;
}

const YEARS = /(\d{1,2})\s*(?:\+|plus)?\s*(?:(?:-|–|—|to)\s*(\d{1,2})\s*\+?\s*)?(?:years?|yrs?)\b/gi;

export function requiredMinYears(description: string): number | null {
  const s = splitSections(description);
  const text = s.split === "undivided" ? s.required : `${s.required}\n${s.other}`;
  let worst: number | null = null;
  for (const m of text.matchAll(YEARS)) {
    const end = m.index! + m[0].length;
    const after = text.slice(end, end + 60).split(/[\n.;]/)[0].toLowerCase();
    const before = (text.slice(Math.max(0, m.index! - 40), m.index!).split(/[\n.;]/).at(-1) ?? "").toLowerCase();
    if (/^\s*old\b/.test(after)) continue;
    if (!/experience/.test(after) && !/experience/.test(before)) continue;
    const min = Number(m[1]);
    if (worst === null || min > worst) worst = min;
  }
  return worst;
}

export function checkExperience(description: string, maxYears: number): string | null {
  const min = requiredMinYears(description);
  if (min !== null && min > maxYears) return `requires ${min}+ years`;
  return null;
}

const NO_SPONSOR = [
  /\b(no|not|unable to|cannot|can ?not|will not|won'?t|does not|do not|don'?t|are not able to)\s+(?:currently\s+)?(?:offer|provide|support|able to)?\s*(?:visa\s+|h-?1b\s+)?sponsor/i,
  /\bsponsorship\s+(?:is\s+)?(?:not|unavailable)\b/i,
  /\bnot\s+eligible\s+for\s+(?:visa\s+)?sponsorship/i,
  /\bwithout\s+(?:the\s+)?(?:need\s+for\s+|requiring\s+)?(?:current\s+or\s+future\s+)?(?:visa\s+|employer\s+)?sponsorship/i,
  /\b(?:u\.?s\.?|united states)\s+citizens?(?:hip)?\s+(?:only|required|is required)/i,
  /\bmust\s+be\s+(?:a\s+)?(?:u\.?s\.?|united states)\s+citizen/i,
  /\bgreen\s+card\s+holders?\s+only/i,
];

export function checkSponsorship(description: string): string | null {
  for (const re of NO_SPONSOR) {
    const m = description.match(re);
    if (m) return `does not sponsor: "${m[0].trim()}"`;
  }
  return null;
}

export const STAFFING_BLOCKLIST = [
  "apex systems",
  "teksystems",
  "insight global",
  "robert half",
  "randstad",
  "kforce",
  "adecco",
  "aerotek",
  "allegis",
  "cybercoders",
  "motion recruitment",
  "hays",
  "kelly services",
  "manpower",
  "manpowergroup",
  "experis",
  "beacon hill",
  "collabera",
  "infosys bpm",
  "dice",
  "jobot",
  "harnham",
];

const AGENCY_PHRASES = [
  /\bour client\b/i,
  /\bon behalf of (?:our|a) client\b/i,
  /\bc2c\b/i,
  /\bcorp(?:\s|-)to(?:\s|-)corp\b/i,
  /\bw2 contract\b/i,
];

export function checkAgency(company: string, description: string, industry: string | null): string | null {
  const c = normalize(company);
  const hit = STAFFING_BLOCKLIST.find((b) => c === b || c.startsWith(`${b} `));
  if (hit) return `staffing firm on blocklist: ${company}`;
  if (industry && /staffing|recruit/i.test(industry)) return `Apollo category is ${industry}`;
  for (const re of AGENCY_PHRASES) {
    const m = description.match(re);
    if (m) return `agency phrase: "${m[0]}"`;
  }
  return null;
}

export function isFresh(postedAt: string | null, now: Date, maxAgeHours: number): boolean {
  if (!postedAt) return false;
  const t = Date.parse(postedAt);
  if (Number.isNaN(t)) return false;
  const age = now.getTime() - t;
  return age >= 0 - 5 * 60_000 && age < maxAgeHours * 3_600_000;
}

export interface MergedPosting extends RawPosting {
  key: string;
  city: string;
  sources: { board: Board; url: string }[];
}

export function dedupe(postings: RawPosting[]): MergedPosting[] {
  const byKey = new Map<string, MergedPosting>();
  for (const p of postings) {
    const key = jobKey(p.company, p.title, p.location);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { ...p, key, city: cityOf(p.location), sources: [{ board: p.board, url: p.url }] });
      continue;
    }
    if (!existing.sources.some((s) => s.url === p.url)) existing.sources.push({ board: p.board, url: p.url });
    if (p.description.length > existing.description.length) existing.description = p.description;
    if (p.postedAt && (!existing.postedAt || p.postedAt < existing.postedAt)) existing.postedAt = p.postedAt;
  }
  return [...byKey.values()];
}

export function hardFilter(p: RawPosting, industry: string | null, settings: Settings): string | null {
  return (
    checkTitle(p.title) ??
    checkExperience(p.description, settings.maxYears) ??
    checkSponsorship(p.description) ??
    checkAgency(p.company, p.description, industry)
  );
}

export interface InboxPage {
  board: Board;
  page: number;
  postings: RawPosting[];
}

export function inboxDir(day: string): string {
  return path.join(paths.inbox(), day);
}

export function readInbox(day: string): InboxPage[] {
  const dir = inboxDir(day);
  if (!fs.existsSync(dir)) return [];
  const pages: InboxPage[] = [];
  for (const name of fs.readdirSync(dir).sort()) {
    const m = name.match(/^(indeed|linkedin|jobright)-p(\d+)\.json$/);
    if (!m) continue;
    const postings = JSON.parse(fs.readFileSync(path.join(dir, name), "utf8")) as RawPosting[];
    pages.push({ board: m[1] as Board, page: Number(m[2]), postings: postings.map((p) => ({ ...p, board: m[1] as Board })) });
  }
  return pages;
}

export interface BoardCursor {
  board: Board;
  nextPage: number;
  exhausted: boolean;
}

export function boardCursors(pages: InboxPage[]): BoardCursor[] {
  return BOARDS.map((board) => {
    const mine = pages.filter((p) => p.board === board).sort((a, b) => a.page - b.page);
    const last = mine.at(-1);
    return { board, nextPage: (last?.page ?? 0) + 1, exhausted: !!last && last.postings.length === 0 };
  });
}

export function pagesToFetch(cursors: BoardCursor[]): { board: Board; page: number }[] {
  const primary = cursors.filter((c) => c.board !== "jobright" && !c.exhausted);
  const pick = primary.length ? primary : cursors.filter((c) => !c.exhausted);
  return pick.map((c) => ({ board: c.board, page: c.nextPage }));
}

export function loadCompanies(): Record<string, string> {
  const file = paths.companies();
  if (!fs.existsSync(file)) return {};
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function industryFor(companies: Record<string, string>, company: string): string | null {
  const n = normalize(company);
  for (const [name, industry] of Object.entries(companies)) if (normalize(name) === n) return industry;
  return null;
}
