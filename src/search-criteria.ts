import fs from "node:fs";
import path from "node:path";
import { DEFAULT_SEARCH, DEFAULT_TITLES, type SearchCriteria, type VisaPreference } from "./search-criteria.defaults.ts";
import { paths } from "./settings.ts";

export type { SearchCriteria, VisaPreference } from "./search-criteria.defaults.ts";
export { DEFAULT_SEARCH, DEFAULT_TITLES } from "./search-criteria.defaults.ts";

export function pathsSearchCriteria() {
  return path.join(paths.profile(), "search-criteria.json");
}

export function loadSearchCriteria(): SearchCriteria {
  const file = pathsSearchCriteria();
  if (!fs.existsSync(file)) return { ...DEFAULT_SEARCH, titles: [...DEFAULT_TITLES] };
  const raw = JSON.parse(fs.readFileSync(file, "utf8")) as Partial<SearchCriteria>;
  return {
    ...DEFAULT_SEARCH,
    ...raw,
    titles: Array.isArray(raw.titles) && raw.titles.length ? raw.titles.map(String) : [...DEFAULT_TITLES],
    salaryMin: typeof raw.salaryMin === "number" ? raw.salaryMin : null,
    salaryMax: typeof raw.salaryMax === "number" ? raw.salaryMax : null,
  };
}

export function saveSearchCriteria(criteria: SearchCriteria): void {
  fs.mkdirSync(paths.profile(), { recursive: true });
  fs.writeFileSync(pathsSearchCriteria(), `${JSON.stringify(criteria, null, 2)}\n`);
}

export function criteriaFromForm(raw: {
  titles: string;
  maxYears: string;
  batchSize: string;
  visa: string;
  salaryMin: string;
  salaryMax: string;
  country: string;
  state: string;
  city: string;
  plainEnglish: string;
}): SearchCriteria {
  const titles = raw.titles
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const salaryMin = raw.salaryMin.trim() ? Number(raw.salaryMin) : null;
  const salaryMax = raw.salaryMax.trim() ? Number(raw.salaryMax) : null;
  const visa: VisaPreference = raw.visa === "must_sponsor" ? "must_sponsor" : "any";
  return {
    titles: titles.length ? titles : [...DEFAULT_TITLES],
    maxYears: Math.min(20, Math.max(0, Number(raw.maxYears) || DEFAULT_SEARCH.maxYears)),
    batchSize: Math.min(50, Math.max(1, Number(raw.batchSize) || DEFAULT_SEARCH.batchSize)),
    visa,
    salaryMin: salaryMin != null && !Number.isNaN(salaryMin) ? salaryMin : null,
    salaryMax: salaryMax != null && !Number.isNaN(salaryMax) ? salaryMax : null,
    country: raw.country.trim(),
    state: raw.state.trim(),
    city: raw.city.trim(),
    plainEnglish: raw.plainEnglish.trim(),
  };
}

export function describeCriteria(c: SearchCriteria): string {
  const lines = [
    `Job titles to search: ${c.titles.join("; ")}`,
    `Target batch size (jobs that pass filters): ${c.batchSize}`,
    `Maximum years of experience required on a posting: ${c.maxYears}`,
    `Visa sponsorship: ${c.visa === "must_sponsor" ? "only keep jobs that explicitly offer sponsorship" : "drop only jobs that refuse sponsorship (default)"}`,
  ];
  if (c.salaryMin != null || c.salaryMax != null) {
    lines.push(`Salary preference (USD): ${c.salaryMin ?? "any"} – ${c.salaryMax ?? "any"}`);
  }
  const loc = [c.city, c.state, c.country].filter(Boolean);
  if (loc.length) lines.push(`Location preference for search and filtering: ${loc.join(", ")}`);
  if (c.plainEnglish) lines.push(`Plain English from Vikas: ${c.plainEnglish}`);
  return lines.join("\n");
}
