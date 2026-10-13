import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const REPO = path.resolve(__dirname, "..");

export function tempRoot(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "shortlist-"));
  for (const sub of ["profile", "agents", "fixtures"]) {
    fs.cpSync(path.join(REPO, sub), path.join(dir, sub), { recursive: true });
  }
  fs.cpSync(path.join(REPO, "fixtures", "demo", "profile"), path.join(dir, "profile"), { recursive: true });
  process.env.SHORTLIST_ROOT = dir;
  return dir;
}

export function writeInbox(root: string, day: string, board: string, page: number, postings: unknown[]): void {
  const dir = path.join(root, "data", "inbox", day);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${board}-p${page}.json`), JSON.stringify(postings));
}

export function posting(over: Record<string, unknown> = {}) {
  return {
    board: "indeed",
    url: `https://example.com/${Math.random().toString(36).slice(2)}`,
    company: "Acme",
    title: "AI Engineer",
    location: "Remote",
    postedAt: new Date(Date.now() - 2 * 3_600_000).toISOString(),
    description: "Requirements:\n- 1+ years of experience with Python, LLM, RAG, LangChain, FastAPI, Docker",
    ...over,
  };
}
