import fs from "node:fs";
import path from "node:path";
import { BOARDS, inboxDir } from "./scout";
import { paths, root } from "./settings";
import { dayKey, emptyTracker, jobId, saveTracker } from "./tracker";
import type { Board, RawPosting } from "./types";

interface FixturePosting extends Omit<RawPosting, "postedAt"> {
  page: number;
  hoursAgo: number | null;
}

const fixture = (name: string) => path.join(root(), "fixtures", "demo", name);

export function seedDemo(opts: { reset?: boolean; now?: Date } = {}) {
  const now = opts.now ?? new Date();
  const day = dayKey(now);
  const repo = process.cwd();
  if (path.resolve(root()) !== path.resolve(repo)) {
    for (const sub of ["profile", "agents", "fixtures"]) {
      const dest = path.join(root(), sub);
      if (opts.reset || !fs.existsSync(dest)) {
        fs.rmSync(dest, { recursive: true, force: true });
        fs.cpSync(path.join(repo, sub), dest, { recursive: true });
      }
    }
  }
  if (opts.reset) {
    saveTracker(emptyTracker());
    fs.rmSync(paths.resumes(), { recursive: true, force: true });
    fs.rmSync(paths.people(), { recursive: true, force: true });
    fs.rmSync(paths.inbox(), { recursive: true, force: true });
  }

  const postings = JSON.parse(fs.readFileSync(fixture("postings.json"), "utf8")) as FixturePosting[];
  const dir = inboxDir(day);
  fs.mkdirSync(dir, { recursive: true });
  const pages = new Map<string, RawPosting[]>();
  for (const p of postings) {
    const { page, hoursAgo, ...rest } = p;
    const postedAt = hoursAgo === null ? null : new Date(now.getTime() - hoursAgo * 3_600_000).toISOString();
    const key = `${p.board}-p${page}`;
    pages.set(key, [...(pages.get(key) ?? []), { ...rest, postedAt }]);
  }
  for (const [key, list] of pages) fs.writeFileSync(path.join(dir, `${key}.json`), JSON.stringify(list, null, 2));
  for (const board of BOARDS as Board[]) {
    const last = Math.max(0, ...postings.filter((p) => p.board === board).map((p) => p.page));
    fs.writeFileSync(path.join(dir, `${board}-p${last + 1}.json`), "[]\n");
  }

  fs.mkdirSync(paths.data(), { recursive: true });
  fs.copyFileSync(fixture("companies.json"), paths.companies());

  const people = JSON.parse(fs.readFileSync(fixture("people.json"), "utf8")) as Record<string, unknown[]>;
  fs.mkdirSync(paths.people(), { recursive: true });
  let peopleFiles = 0;
  for (const [company, list] of Object.entries(people)) {
    const p = postings.find((x) => x.company === company);
    if (!p) continue;
    fs.writeFileSync(path.join(paths.people(), `${jobId(p.company, p.title, p.location)}.json`), JSON.stringify(list, null, 2));
    peopleFiles++;
  }
  return { day, inbox: dir, pages: pages.size, postings: postings.length, peopleFiles };
}
