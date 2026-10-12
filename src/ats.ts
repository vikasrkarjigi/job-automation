import { countTerms, stripLatex } from "./keywords";
import type { Confirmation, EvidenceBank } from "./profile";
import { splitSections } from "./sections";
import { loadFamilies } from "./skill-families";
import type { JobKeyword, Rename, ScoreResult, Settings } from "./types";

export interface ScoreContext {
  evidence: EvidenceBank;
  confirmations: Map<string, Confirmation>;
  families?: Record<string, string[]>;
  preferredWeight: number;
}

export function extractKeywords(description: string, preferredWeight: number): { split: ScoreResult["split"]; keywords: JobKeyword[] } {
  const s = splitSections(description);
  const req = countTerms(s.required);
  const pref = countTerms(s.preferred);
  const other = countTerms(s.other);
  const terms = new Set([...req.keys(), ...pref.keys(), ...other.keys()]);
  const keywords: JobKeyword[] = [];
  for (const term of terms) {
    const tier = req.has(term) ? "required" : "preferred";
    keywords.push({
      term,
      tier,
      weight: tier === "required" ? 1 : preferredWeight,
      count: (req.get(term) ?? 0) + (pref.get(term) ?? 0) + (other.get(term) ?? 0),
    });
  }
  keywords.sort((a, b) => (a.tier === b.tier ? b.count - a.count || a.term.localeCompare(b.term) : a.tier === "required" ? -1 : 1));
  return { split: s.split, keywords };
}

export function scoreJob(description: string, resumeTex: string, ctx: ScoreContext): ScoreResult {
  const { split, keywords } = extractKeywords(description, ctx.preferredWeight);
  const families = ctx.families ?? loadFamilies();
  const onResume = countTerms(stripLatex(resumeTex));
  const jobTerms = new Set(keywords.map((k) => k.term));
  const usedSources = new Set<string>();

  const matched: string[] = [];
  const unmentioned: string[] = [];
  const renames: Rename[] = [];
  const needsConfirm: string[] = [];
  const gaps: string[] = [];
  let total = 0;
  let matchedW = 0;
  let coverW = 0;

  for (const k of keywords) {
    total += k.weight;
    if (onResume.has(k.term)) {
      matched.push(k.term);
      matchedW += k.weight;
      coverW += k.weight;
      continue;
    }
    const confirmation = ctx.confirmations.get(k.term);
    if (ctx.evidence[k.term] || confirmation?.answer === "yes") {
      unmentioned.push(k.term);
      coverW += k.weight;
      continue;
    }
    const family = Object.values(families).find((m) => m.includes(k.term)) ?? [];
    const source = family.find((m) => m !== k.term && onResume.has(m) && !jobTerms.has(m) && !usedSources.has(m));
    if (source) {
      usedSources.add(source);
      renames.push({ from: source, to: k.term });
      unmentioned.push(k.term);
      coverW += k.weight;
      continue;
    }
    if (confirmation?.answer === "no" || k.tier === "preferred") {
      gaps.push(k.term);
      continue;
    }
    needsConfirm.push(k.term);
  }

  const pct = (w: number) => (total === 0 ? 0 : Math.round((100 * w) / total));
  return {
    split,
    keywords,
    score: pct(matchedW),
    ceiling: pct(coverW),
    matched,
    unmentioned,
    renames,
    needsConfirm,
    gaps,
  };
}

export type GateDecision =
  | { decision: "tailor" }
  | { decision: "confirm"; keywords: string[] }
  | { decision: "ignore"; reason: string };

export function gate(result: ScoreResult, settings: Settings): GateDecision {
  if (result.keywords.length === 0) return { decision: "ignore", reason: "no recognizable skills in the description" };
  const requiredGaps = result.keywords.filter((k) => k.tier === "required" && result.gaps.includes(k.term));
  if (requiredGaps.length) {
    return { decision: "ignore", reason: `required skill you declined: ${requiredGaps.map((k) => k.term).join(", ")}` };
  }
  const total = result.keywords.reduce((s, k) => s + k.weight, 0);
  const pending = result.keywords.filter((k) => result.needsConfirm.includes(k.term)).reduce((s, k) => s + k.weight, 0);
  const optimistic = Math.round(result.ceiling + (100 * pending) / total);
  if (optimistic < settings.gateCeiling) {
    return { decision: "ignore", reason: `ceiling ${optimistic} is under ${settings.gateCeiling}` };
  }
  if (result.needsConfirm.length > settings.maxAsksPerJob) {
    return {
      decision: "ignore",
      reason: `${result.needsConfirm.length} required skills with no evidence: ${result.needsConfirm.join(", ")}`,
    };
  }
  if (result.needsConfirm.length) return { decision: "confirm", keywords: result.needsConfirm };
  return { decision: "tailor" };
}
