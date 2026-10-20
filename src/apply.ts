import crypto from "node:crypto";
import fs from "node:fs";
import { paths } from "./settings.ts";
import { normalize } from "./tracker.ts";
import type { ApplyPacket, JobRow } from "./types.ts";

export interface SavedAnswer {
  key: string;
  question: string;
  answer: string;
}

const ANSWER_LINE = /^-\s*([a-z0-9_]+)\s*\((.+)\):\s*(.*)$/;

export function parseAnswers(md: string): SavedAnswer[] {
  const out: SavedAnswer[] = [];
  for (const line of md.split("\n")) {
    const m = line.trim().match(ANSWER_LINE);
    if (m) out.push({ key: m[1], question: m[2].trim(), answer: m[3].trim() });
  }
  return out;
}

/** Answers the apply agent never needs from you: written per job, or fixed settings. */
export const NOT_BLANK = new Set(["why_role", "password_secret"]);

export function answerSections(md: string): { title: string; answers: SavedAnswer[] }[] {
  const out: { title: string; answers: SavedAnswer[] }[] = [];
  for (const line of md.split("\n")) {
    const heading = line.match(/^##\s+(.+)$/);
    if (heading) {
      out.push({ title: heading[1].trim(), answers: [] });
      continue;
    }
    const answer = parseAnswers(line)[0];
    if (answer && out.length) out[out.length - 1].answers.push(answer);
  }
  return out.filter((s) => s.answers.length);
}

export function loadAnswers(): Map<string, SavedAnswer> {
  const md = fs.readFileSync(paths.applyMd(), "utf8");
  return new Map(parseAnswers(md).map((a) => [a.key, a]));
}

const RULES: [RegExp, string][] = [
  [/visa (type|status)|work authori[sz]ation (type|status)|current (visa|immigration)/, "visa_type"],
  [/authori[sz]ed to work/, "authorized_us"],
  [/relocat/, "relocate"],
  [/salary|compensation|pay expectation|desired pay/, "salary"],
  [/start date|when can you start|available to start/, "start_date"],
  [/notice period/, "notice_period"],
  [/years of (relevant |professional |work )?experience/, "years_experience"],
  [/field of study|\bmajor\b/, "field_of_study"],
  [/degree|education level/, "degree"],
  [/previously (worked|been employed|employed)|former employee|worked (here|for us) before/, "previously_employed"],
  [/non ?-?compete/, "non_compete"],
  [/how did you hear|where did you (find|hear)|referral source/, "heard_about"],
  [/background check/, "background_check"],
  [/drug (screen|test)/, "drug_screen"],
  [/18 years|at least 18|over 18/, "over_18"],
  [/why .*(interested|this role|join|company|us)/, "why_role"],
  [/gender/, "gender"],
  [/\brace\b|ethnic/, "race"],
  [/veteran/, "veteran"],
  [/disabilit/, "disability"],
  [/linkedin/, "linkedin"],
  [/github/, "github"],
  [/website|portfolio/, "website"],
  [/travel/, "travel"],
  [/remote|hybrid|on ?-?site|work arrangement/, "work_mode"],
  [/phone/, "phone"],
  [/e ?-?mail/, "email"],
  [/preferred (first )?name|first name/, "preferred_name"],
  [/legal name|full name|^name$/, "legal_name"],
  [/\bcity\b/, "city"],
  [/\bstate\b/, "state"],
  [/country/, "country"],
];

/** Questions whose answer depends on the job, so a saved answer is never reused verbatim. */
const OPEN_ENDED =
  /^(why\b|describe\b|tell (us|me)\b|explain\b|share\b|walk (us|me)\b|give (us )?an example|how would you\b|what (interests|excites|draws|motivates|attracts) you|what makes you|what (do|would) you (bring|hope)|cover letter|is there anything else|anything else|additional information)/;

export function isOpenEnded(question: string): boolean {
  return OPEN_ENDED.test(question.toLowerCase().trim());
}

export const isWhyRole = (question: string) => /\bwhy\b.*\b(interested|this (role|position|job|company|team)|join|work (here|for|at)|us)\b/i.test(question);

export type AnswerResult =
  | { ok: true; key: string; answer: string }
  | { ok: false; key: string; reason: string; write?: true };

const yes = (s: string | undefined) => /^y(es)?\b/i.test(s ?? "");

export function customKey(question: string): string {
  return `custom_${crypto.createHash("sha1").update(normalize(question)).digest("hex").slice(0, 8)}`;
}

export function answerFor(question: string, answers: Map<string, SavedAnswer>): AnswerResult {
  const q = question.toLowerCase().trim();
  if (/sponsor/.test(q)) {
    const now = answers.get("sponsorship_now")?.answer;
    const future = answers.get("sponsorship_future")?.answer;
    if (/now or in the future|now or future|current or future|now, or in the future/.test(q)) {
      if (!now || !future) return { ok: false, key: "sponsorship_now", reason: "sponsorship answers are blank in apply.md" };
      return { ok: true, key: "sponsorship_now", answer: yes(now) || yes(future) ? "Yes" : "No" };
    }
    const key = /future/.test(q) ? "sponsorship_future" : "sponsorship_now";
    const a = answers.get(key)?.answer;
    return a ? { ok: true, key, answer: a } : { ok: false, key, reason: `${key} is blank in apply.md` };
  }
  if (isWhyRole(question)) return { ok: false, key: "why_role", reason: "written for this job", write: true };
  const custom = answers.get(customKey(question));
  if (custom) {
    return custom.answer
      ? { ok: true, key: custom.key, answer: custom.answer }
      : { ok: false, key: custom.key, reason: "question is in apply.md with no answer yet" };
  }
  for (const [re, key] of RULES) {
    if (!re.test(q)) continue;
    const a = answers.get(key)?.answer;
    return a ? { ok: true, key, answer: a } : { ok: false, key, reason: `${key} is blank in apply.md` };
  }
  if (isOpenEnded(question)) return { ok: false, key: customKey(question), reason: "written for this job", write: true };
  return { ok: false, key: customKey(question), reason: "new question, added to apply.md" };
}

export function appendQuestion(question: string): string {
  const key = customKey(question);
  const md = fs.readFileSync(paths.applyMd(), "utf8");
  if (parseAnswers(md).some((a) => a.key === key)) return key;
  const clean = question.replace(/[()\n]/g, " ").replace(/\s+/g, " ").trim();
  fs.writeFileSync(paths.applyMd(), md.replace(/\n*$/, "\n") + `- ${key} (${clean}):\n`);
  return key;
}

export function saveAnswer(key: string, answer: string, question?: string): SavedAnswer {
  const md = fs.readFileSync(paths.applyMd(), "utf8");
  const clean = answer.replace(/\n+/g, " ").trim();
  const existing = parseAnswers(md).find((a) => a.key === key);
  if (!existing && !question) throw new Error(`No saved question with key ${key}. Pass the question text to add it.`);
  const q = existing?.question ?? question!.replace(/[()\n]/g, " ").replace(/\s+/g, " ").trim();
  const line = `- ${key} (${q}): ${clean}`;
  const re = new RegExp(`^-\\s*${key}\\s*\\(.*$`, "m");
  fs.writeFileSync(paths.applyMd(), existing ? md.replace(re, () => line) : md.replace(/\n*$/, "\n") + line + "\n");
  return { key, question: q, answer: clean };
}

export function detectAts(url: string): ApplyPacket["ats"] {
  if (/myworkdayjobs|workday/i.test(url)) return "workday";
  if (/greenhouse\.io/i.test(url)) return "greenhouse";
  if (/lever\.co/i.test(url)) return "lever";
  return "other";
}

const PACKET_KEYS = [
  "legal_name", "preferred_name", "email", "phone", "city", "state", "country", "linkedin", "github", "website",
  "authorized_us", "sponsorship_now", "sponsorship_future", "relocate", "work_mode", "start_date", "salary",
];

export function buildPacket(job: JobRow, answers: Map<string, SavedAnswer>): ApplyPacket {
  if (!job.resumePath) throw new Error(`${job.id} has no tailored resume`);
  const url = job.sources.find((s) => detectAts(s.url) !== "other")?.url ?? job.sources[0].url;
  const picked: Record<string, string> = {};
  for (const k of PACKET_KEYS) picked[k] = answers.get(k)?.answer ?? "";
  const blank = ["authorized_us", "sponsorship_now", "sponsorship_future", "relocate", "salary"].filter((k) => !picked[k]);
  return {
    url,
    ats: detectAts(url),
    resumePath: job.resumePath,
    accountEmail: answers.get("account_email")?.answer || answers.get("email")?.answer || "",
    passwordSecret: answers.get("password_secret")?.answer || "BOARD_PASSWORD",
    answers: picked,
    blockedOn: blank.length ? `blank in apply.md: ${blank.join(", ")}` : null,
  };
}

export interface MailMessage {
  from: string;
  subject: string;
  body: string;
  receivedAt: string;
}

export function extractOtp(messages: MailMessage[], company: string, since: Date): string | null {
  const name = normalize(company);
  const relevant = messages
    .filter((m) => Date.parse(m.receivedAt) >= since.getTime())
    .filter((m) => normalize(`${m.from} ${m.subject} ${m.body}`).includes(name))
    .sort((a, b) => Date.parse(b.receivedAt) - Date.parse(a.receivedAt));
  for (const m of relevant) {
    const text = `${m.subject}\n${m.body}`;
    const near = text.match(/(?:code|passcode|otp|verification|verify)[^0-9]{0,40}(\d{4,8})\b/i);
    if (near) return near[1];
    const six = text.match(/\b(\d{6})\b/);
    if (six) return six[1];
  }
  return null;
}
