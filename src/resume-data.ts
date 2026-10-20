import fs from "node:fs";
import path from "node:path";
import { loadBaseResume } from "./profile.ts";
import { root } from "./settings.ts";
import { readState } from "./store.ts";
import { loadTracker } from "./tracker.ts";
import type { JobRow } from "./types.ts";

export interface StoredResume {
  job: JobRow | null;
  rel: string | null;
  tex: string | null;
  base: string | null;
}

/** The exact file a job's recruiter sees: the submitted copy once submitted, else the tailored one. */
export function readResume(id: string): StoredResume {
  const job = loadTracker().jobs.find((j) => j.id === id) ?? null;
  const rel = job?.submittedResumePath ?? job?.resumePath ?? null;
  const file = rel ? path.join(/*turbopackIgnore: true*/ root(), rel) : null;
  const inside = !!file && file.startsWith(path.join(root(), "resumes") + path.sep);
  const tex = inside && fs.existsSync(file!) ? fs.readFileSync(file!, "utf8") : null;
  let base: string | null = null;
  try {
    base = loadBaseResume();
  } catch {
    base = null;
  }
  return { job, rel, tex, base };
}

export const loadResume = (id: string) => readState(() => readResume(id));
