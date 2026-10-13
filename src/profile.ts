import fs from "node:fs";
import { paths } from "./settings.ts";

export interface EvidenceEntry {
  snippet: string;
  bullet?: string;
}

export type EvidenceBank = Record<string, EvidenceEntry>;

export interface Confirmation {
  term: string;
  answer: "yes" | "no";
  note: string;
}

export function loadBaseResume(): string {
  return fs.readFileSync(paths.baseResume(), "utf8");
}

export function loadEvidence(): EvidenceBank {
  const file = paths.evidence();
  if (!fs.existsSync(file)) return {};
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

const CONFIRM_LINE = /^-\s*(.+?):\s*(yes|no)\s*(?:\|\s*(.*))?$/i;

export function parseConfirmations(md: string): Confirmation[] {
  const out: Confirmation[] = [];
  for (const line of md.split("\n")) {
    const m = line.trim().match(CONFIRM_LINE);
    if (m) out.push({ term: m[1].trim(), answer: m[2].toLowerCase() as "yes" | "no", note: (m[3] ?? "").trim() });
  }
  return out;
}

export function loadConfirmations(): Map<string, Confirmation> {
  const file = paths.confirmed();
  if (!fs.existsSync(file)) return new Map();
  return new Map(parseConfirmations(fs.readFileSync(file, "utf8")).map((c) => [c.term, c]));
}

export function recordConfirmation(term: string, answer: "yes" | "no", note = ""): void {
  const file = paths.confirmed();
  const existing = fs.existsSync(file)
    ? fs.readFileSync(file, "utf8")
    : "# Confirmed keywords\n\nOne line per keyword the tailor asked about. A yes is used on later jobs without asking again.\n\n";
  const lines = existing.split("\n").filter((l) => {
    const m = l.trim().match(CONFIRM_LINE);
    return !m || m[1].trim() !== term;
  });
  const body = lines.join("\n").replace(/\n*$/, "\n");
  const entry = `- ${term}: ${answer}${note ? ` | ${note.replace(/\n/g, " ")}` : ""}\n`;
  fs.writeFileSync(file, body + entry);
}
