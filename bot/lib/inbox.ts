import fs from "node:fs";
import path from "node:path";
import type { HostFilesApi } from "@cursor/bdk";
import { inboxDir } from "../../src/scout.ts";
import { paths } from "../../src/settings.ts";
import { dayKey } from "../../src/tracker.ts";
import type { Board } from "../../src/types.ts";
import { withState } from "./state.ts";

export type PostingIn = { url: string; company: string; title: string; location: string; postedAt: string | null; description: string };

const UNIT_MS: Record<string, number> = { minute: 60_000, hour: 3_600_000, day: 86_400_000, week: 604_800_000 };

/** Boards often say "3 hours ago". The freshness filter needs an instant. */
export function toInstant(postedAt: string | null, now: Date): string | null {
  if (!postedAt) return null;
  if (!Number.isNaN(Date.parse(postedAt)) && /\d{4}-\d{2}-\d{2}/.test(postedAt)) return new Date(postedAt).toISOString();
  const s = postedAt.toLowerCase();
  if (/just now|today|moments? ago/.test(s)) return now.toISOString();
  const m = s.match(/(\d+)\s*\+?\s*(minute|min|hour|hr|day|week)s?/);
  if (!m) return null;
  const unit = m[2].startsWith("min") ? "minute" : m[2].startsWith("h") ? "hour" : m[2];
  return new Date(now.getTime() - Number(m[1]) * UNIT_MS[unit]).toISOString();
}

export function saveInboxPage(
  files: HostFilesApi,
  now: Date,
  board: Board,
  page: number,
  postings: PostingIn[],
  companyIndustries?: Record<string, string>,
) {
  return withState(files, () => {
    const dir = inboxDir(dayKey(now));
    fs.mkdirSync(dir, { recursive: true });
    const rows = postings.map((p) => ({ board, ...p, postedAt: toInstant(p.postedAt, now) }));
    fs.writeFileSync(path.join(dir, `${board}-p${page}.json`), JSON.stringify(rows, null, 2));
    if (companyIndustries && Object.keys(companyIndustries).length) {
      fs.mkdirSync(paths.data(), { recursive: true });
      const existing = fs.existsSync(paths.companies()) ? JSON.parse(fs.readFileSync(paths.companies(), "utf8")) : {};
      fs.writeFileSync(paths.companies(), JSON.stringify({ ...existing, ...companyIndustries }, null, 2));
    }
    return { saved: rows.length, undated: rows.filter((r) => !r.postedAt).length, board, page, exhausted: rows.length === 0 };
  }, now);
}
