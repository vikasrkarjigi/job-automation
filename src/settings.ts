import fs from "node:fs";
import path from "node:path";
import type { Settings } from "./types.ts";

export const root = () => process.env.SHORTLIST_ROOT ?? process.cwd();

export const paths = {
  profile: () => path.join(root(), "profile"),
  baseResume: () => path.join(root(), "profile", "base.tex"),
  evidence: () => path.join(root(), "profile", "evidence.json"),
  confirmed: () => path.join(root(), "profile", "confirmed-keywords.md"),
  families: () => path.join(root(), "profile", "skill-families.json"),
  settings: () => path.join(root(), "profile", "settings.json"),
  applyMd: () => path.join(root(), "agents", "apply.md"),
  data: () => path.join(root(), "data"),
  tracker: () => path.join(root(), "data", "tracker.json"),
  inbox: () => path.join(root(), "data", "inbox"),
  people: () => path.join(root(), "data", "people"),
  companies: () => path.join(root(), "data", "companies.json"),
  resumes: () => path.join(root(), "resumes"),
  trackerMd: () => path.join(root(), "tracker", "TRACKER.md"),
};

export const DEFAULT_SETTINGS: Settings = {
  batchSize: 10,
  maxAgeHours: 24,
  maxYears: 3,
  gateCeiling: 80,
  maxAsksPerJob: 3,
  targetScore: 88,
  preferredWeight: 0.4,
  peoplePerJob: 5,
  inviteCapPerDay: 15,
  draftTries: 2,
};

export function loadSettings(): Settings {
  const file = paths.settings();
  if (!fs.existsSync(file)) return DEFAULT_SETTINGS;
  return { ...DEFAULT_SETTINGS, ...JSON.parse(fs.readFileSync(file, "utf8")) };
}

export function saveSettings(partial: Partial<Settings>): Settings {
  const next = { ...loadSettings(), ...partial };
  fs.mkdirSync(paths.profile(), { recursive: true });
  fs.writeFileSync(paths.settings(), `${JSON.stringify(next, null, 2)}\n`);
  return next;
}
