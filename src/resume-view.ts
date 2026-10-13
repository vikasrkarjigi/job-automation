import { stripLatex } from "./keywords.ts";
import { visibleText } from "./tailor.ts";

export type Change = "same" | "new" | "edited";
export type Run = { text: string; bold: boolean };

export type ResumeBlock =
  | { kind: "entry"; parts: string[] }
  | { kind: "bullet"; runs: Run[]; text: string; change: Change }
  | { kind: "skills"; label: string; items: { text: string; added: boolean }[] }
  | { kind: "text"; text: string };

export type ResumeDoc = {
  header: string[];
  sections: { title: string; blocks: ResumeBlock[] }[];
  changes: { newBullets: number; editedBullets: number; addedSkills: string[] };
};

const ITEM = /\\resumeItem\{((?:[^{}]|\{[^{}]*\})*)\}/;
const SKILL = /\\item\s*\\textbf\{([^}]*)\}\s*\{?:?\s*([^}]*)\}?/;
const SECTION = /\\section\*?\{([^}]*)\}/;

function body(tex: string): string {
  const start = tex.indexOf("\\begin{document}");
  const end = tex.indexOf("\\end{document}");
  return tex.slice(start < 0 ? 0 : start + "\\begin{document}".length, end < 0 ? undefined : end);
}

const uncomment = (line: string) => {
  const i = line.search(/(?<!\\)%/);
  return i < 0 ? line : line.slice(0, i);
};

function runsOf(latex: string): Run[] {
  const runs: Run[] = [];
  const re = /\\textbf\{([^{}]*)\}/g;
  let last = 0;
  for (const m of latex.matchAll(re)) {
    if (m.index! > last) runs.push({ text: visibleText(latex.slice(last, m.index)), bold: false });
    runs.push({ text: visibleText(m[1]), bold: true });
    last = m.index! + m[0].length;
  }
  if (last < latex.length) runs.push({ text: visibleText(latex.slice(last)), bold: false });
  const out = runs.filter((r) => r.text);
  for (let i = 1; i < out.length; i++) {
    if (/^[,.;:)]/.test(out[i].text)) continue;
    if (!out[i - 1].bold) out[i - 1].text += " ";
    else out[i].text = " " + out[i].text;
  }
  return out;
}

const words = (s: string) => new Set(s.toLowerCase().match(/[a-z0-9+#]+/g) ?? []);

function similarity(a: string, b: string): number {
  const wa = words(a);
  const wb = words(b);
  let shared = 0;
  for (const w of wa) if (wb.has(w)) shared++;
  return shared / Math.max(wa.size, wb.size, 1);
}

const splitList = (s: string) =>
  stripLatex(s)
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

function baseIndex(baseTex: string | null) {
  const bullets: string[] = [];
  const skills = new Set<string>();
  if (!baseTex) return { bullets, skills };
  for (const raw of body(baseTex).split("\n")) {
    const line = uncomment(raw);
    const item = line.match(ITEM);
    if (item) bullets.push(runsOf(item[1]).map((r) => r.text).join(""));
    const skill = line.match(SKILL);
    if (skill && !item) for (const s of splitList(skill[2])) skills.add(s.toLowerCase());
  }
  return { bullets, skills };
}

export function parseResume(tex: string, baseTex: string | null = null): ResumeDoc {
  const base = baseIndex(baseTex);
  const doc: ResumeDoc = { header: [], sections: [], changes: { newBullets: 0, editedBullets: 0, addedSkills: [] } };
  let inHeader = false;
  let current: ResumeDoc["sections"][number] | null = null;

  for (const raw of body(tex).split("\n")) {
    const line = uncomment(raw).trim();
    if (!line) continue;
    if (line.startsWith("\\begin{center}")) {
      inHeader = true;
      continue;
    }
    if (line.startsWith("\\end{center}")) {
      inHeader = false;
      continue;
    }
    if (inHeader) {
      for (const part of line.split("\\\\")) {
        const text = visibleText(part.replace(/\\(Large|large|LARGE|huge|Huge|small)\b/g, "").replace(/\\quad/g, " · "));
        if (text) doc.header.push(text.replace(/^·\s*|\s*·$/g, ""));
      }
      continue;
    }
    const section = line.match(SECTION);
    if (section) {
      current = { title: visibleText(section[1]), blocks: [] };
      doc.sections.push(current);
      continue;
    }
    if (!current || /^\\(begin|end)\{itemize\}|^\\(vspace|newpage|hfill)\b/.test(line)) continue;

    const item = line.match(ITEM);
    if (item) {
      const runs = runsOf(item[1]);
      const text = runs.map((r) => r.text).join("");
      let change: Change = "same";
      if (baseTex && !base.bullets.includes(text)) {
        change = base.bullets.some((b) => similarity(b, text) >= 0.6) ? "edited" : "new";
        if (change === "new") doc.changes.newBullets++;
        else doc.changes.editedBullets++;
      }
      current.blocks.push({ kind: "bullet", runs, text, change });
      continue;
    }
    const skill = line.match(SKILL);
    if (skill) {
      const items = splitList(skill[2]).map((s) => {
        const added = !!baseTex && !base.skills.has(s.toLowerCase());
        if (added) doc.changes.addedSkills.push(s);
        return { text: s, added };
      });
      current.blocks.push({ kind: "skills", label: visibleText(skill[1]), items });
      continue;
    }
    if (line.includes("\\hfill")) {
      current.blocks.push({ kind: "entry", parts: line.replace(/\\\\\s*$/, "").split("\\hfill").map((p) => visibleText(p)).filter(Boolean) });
      continue;
    }
    const text = visibleText(line);
    if (text && !text.startsWith("\\")) current.blocks.push({ kind: "text", text });
  }
  return doc;
}

export function resumeAsText(doc: ResumeDoc): string {
  const out: string[] = [...doc.header, ""];
  for (const s of doc.sections) {
    out.push(s.title.toUpperCase());
    for (const b of s.blocks) {
      if (b.kind === "entry") out.push(b.parts.join(" | "));
      if (b.kind === "text") out.push(b.text);
      if (b.kind === "bullet") out.push(`• ${b.text}${b.change === "new" ? "  [added by tailor]" : b.change === "edited" ? "  [reworded by tailor]" : ""}`);
      if (b.kind === "skills") out.push(`${b.label}: ${b.items.map((i) => (i.added ? `${i.text} [added]` : i.text)).join(", ")}`);
    }
    out.push("");
  }
  return out.join("\n").trim();
}
