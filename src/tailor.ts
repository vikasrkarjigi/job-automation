import { aliasesFor, countTerms, stripLatex } from "./keywords";
import type { Confirmation, EvidenceBank } from "./profile";
import type { ScoreResult } from "./types";

export const SKILLS_MARKER = "%% tailor:skills";
export const BULLETS_MARKER = "%% tailor:bullets";
export const MAX_NEW_BULLETS = 3;

const DASHES = /[-‐‑‒–—―]/;
const ITEM = /\\resumeItem\{((?:[^{}]|\{[^{}]*\})*)\}/g;

export function visibleText(latex: string): string {
  return stripLatex(latex).replace(/\s+/g, " ").trim();
}

export function bulletsOf(tex: string): string[] {
  return [...tex.matchAll(ITEM)].map((m) => m[1]);
}

const firstWord = (bullet: string) => (visibleText(bullet).split(" ")[0] ?? "").toLowerCase().replace(/[^a-z]/g, "");

export interface BulletCheck {
  ok: boolean;
  errors: string[];
  length: number;
}

export function checkBullet(bullet: string, existing: string[], allowedTerms: Set<string>): BulletCheck {
  const errors: string[] = [];
  const text = visibleText(bullet);
  if (text.length < 200 || text.length > 230) errors.push(`length ${text.length}, needs 200 to 230`);
  if (DASHES.test(text)) errors.push("contains a hyphen or dash");
  const bolds = bullet.match(/\\textbf\{/g)?.length ?? 0;
  if (bolds !== 1) errors.push(`has ${bolds} bold phrases, needs exactly 1`);
  const verb = firstWord(bullet);
  if (!verb) errors.push("does not start with a verb");
  else if (existing.some((b) => firstWord(b) === verb)) errors.push(`verb "${verb}" is already used`);
  const invented = [...countTerms(text).keys()].filter((t) => !allowedTerms.has(t));
  if (invented.length) errors.push(`names skills without evidence: ${invented.join(", ")}`);
  return { ok: errors.length === 0, errors, length: text.length };
}

export function allowedTermsFor(baseTex: string, analysis: ScoreResult, evidence: EvidenceBank, confirmations: Map<string, Confirmation>): Set<string> {
  const allowed = new Set(countTerms(stripLatex(baseTex)).keys());
  for (const t of Object.keys(evidence)) allowed.add(t);
  for (const c of confirmations.values()) if (c.answer === "yes") allowed.add(c.term);
  for (const r of analysis.renames) allowed.add(r.to);
  return allowed;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
export const latexEscape = (s: string) => s.replace(/([&%$#_])/g, "\\$1");

export function applyRename(tex: string, from: string, to: string): string {
  const alts = aliasesFor(from).map((a) => escapeRe(a).replace(/&/g, "\\\\?&"));
  const re = new RegExp(`(?<![A-Za-z0-9+#])(?:${alts.join("|")})(?![A-Za-z0-9+#])`, "gi");
  return tex
    .split("\n")
    .map((line) => {
      const i = line.search(/(?<!\\)%/);
      const code = i === -1 ? line : line.slice(0, i);
      const comment = i === -1 ? "" : line.slice(i);
      return code.replace(re, latexEscape(to)) + comment;
    })
    .join("\n");
}

export function addSkills(tex: string, terms: string[]): string {
  if (!terms.length) return tex;
  const lines = tex.split("\n");
  const idx = lines.findIndex((l) => l.includes(SKILLS_MARKER) && !l.trimStart().startsWith("%"));
  if (idx === -1) throw new Error(`base resume has no "${SKILLS_MARKER}" line`);
  const line = lines[idx];
  const markerAt = line.indexOf(SKILLS_MARKER);
  const code = line.slice(0, markerAt);
  const close = code.lastIndexOf("}");
  if (close === -1) throw new Error(`skills line needs a closing brace before "${SKILLS_MARKER}"`);
  const addition = terms.map((t) => `, ${latexEscape(t)}`).join("");
  lines[idx] = code.slice(0, close) + addition + code.slice(close) + line.slice(markerAt);
  return lines.join("\n");
}

export function addBullet(tex: string, bullet: string): string {
  const lines = tex.split("\n");
  const idx = lines.findIndex((l) => l.trim() === BULLETS_MARKER);
  if (idx === -1) throw new Error(`base resume has no "${BULLETS_MARKER}" line`);
  const indent = lines[idx].match(/^\s*/)?.[0] ?? "";
  lines.splice(idx + 1, 0, `${indent}\\resumeItem{${bullet}}`);
  return lines.join("\n");
}

export interface TailorResult {
  tex: string;
  notes: string[];
  missingRequired: string[];
}

export function tailorResume(
  baseTex: string,
  analysis: ScoreResult,
  evidence: EvidenceBank,
  confirmations: Map<string, Confirmation>,
): TailorResult {
  const notes: string[] = [];
  let tex = baseTex;

  for (const r of analysis.renames) {
    tex = applyRename(tex, r.from, r.to);
    notes.push(`renamed ${r.from} to ${r.to}, same family`);
  }

  const renamed = new Set(analysis.renames.map((r) => r.to));
  const toAdd = analysis.unmentioned.filter((t) => !renamed.has(t));
  const allowed = allowedTermsFor(baseTex, analysis, evidence, confirmations);

  let added = 0;
  for (const term of toAdd) {
    const bullet = evidence[term]?.bullet;
    if (!bullet || added >= MAX_NEW_BULLETS) continue;
    const check = checkBullet(bullet, bulletsOf(tex), allowed);
    if (check.ok) {
      tex = addBullet(tex, bullet);
      added++;
      notes.push(`added evidence bullet for ${term}`);
    } else {
      notes.push(`kept ${term} on the skills line only, bullet failed: ${check.errors.join("; ")}`);
    }
  }

  const present = countTerms(stripLatex(tex));
  const skillsOnly = toAdd.filter((t) => !present.has(t));
  if (skillsOnly.length) {
    tex = addSkills(tex, skillsOnly);
    notes.push(`added to skills: ${skillsOnly.join(", ")}`);
  }

  const final = countTerms(stripLatex(tex));
  const missingRequired = analysis.keywords
    .filter((k) => k.tier === "required" && !final.has(k.term))
    .map((k) => k.term);
  return { tex, notes, missingRequired };
}
