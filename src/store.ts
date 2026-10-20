import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * The dashboard and the scheduled cloud agents share one source of truth: the
 * pipeline files in the GitHub repository. When a token is configured, each
 * request copies those files into a scratch directory, runs the same pipeline
 * code there, and commits whatever changed back to the branch. Without a token
 * the pipeline runs directly on the local checkout.
 */

const SYNC = ["profile/", "agents/", "data/", "resumes/", "tracker/"];
const SKIP = ["data/inbox/"];

interface Repo {
  token: string;
  repo: string;
  branch: string;
}

export function repoConfig(): Repo | null {
  const token = process.env.SHORTLIST_GITHUB_TOKEN?.trim() || process.env.GITHUB_TOKEN?.trim();
  if (!token) return null;
  return {
    token,
    repo: process.env.SHORTLIST_GITHUB_REPO?.trim() || "vikasrkarjigi/job-automation",
    branch: process.env.SHORTLIST_GITHUB_BRANCH?.trim() || "main",
  };
}

async function gh<T>(cfg: Repo, method: string, route: string, body?: unknown): Promise<T> {
  const res = await fetch(`https://api.github.com/repos/${cfg.repo}${route}`, {
    method,
    cache: "no-store",
    headers: {
      authorization: `Bearer ${cfg.token}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new GitHubError(res.status, `GitHub ${method} ${route} failed with ${res.status}: ${text.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

export class GitHubError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const blobCache = new Map<string, Buffer>();
const gitSha = (b: Buffer) => crypto.createHash("sha1").update(`blob ${b.length}\0`).update(b).digest("hex");

interface Snapshot {
  commit: string;
  tree: string;
  files: Map<string, string>;
}

async function snapshot(cfg: Repo): Promise<Snapshot> {
  const ref = await gh<{ object: { sha: string } }>(cfg, "GET", `/git/ref/heads/${encodeURIComponent(cfg.branch)}`);
  const commit = ref.object.sha;
  const tree = await gh<{ sha: string; tree: { path: string; type: string; sha: string }[]; truncated: boolean }>(
    cfg,
    "GET",
    `/git/trees/${commit}?recursive=1`,
  );
  const files = new Map<string, string>();
  for (const e of tree.tree) {
    if (e.type !== "blob" || !SYNC.some((p) => e.path.startsWith(p)) || SKIP.some((p) => e.path.startsWith(p))) continue;
    files.set(e.path, e.sha);
  }
  const missing = [...new Set(files.values())].filter((sha) => !blobCache.has(sha));
  for (let i = 0; i < missing.length; i += 16) {
    await Promise.all(
      missing.slice(i, i + 16).map(async (sha) => {
        const blob = await gh<{ content: string; encoding: string }>(cfg, "GET", `/git/blobs/${sha}`);
        blobCache.set(sha, Buffer.from(blob.content, blob.encoding === "base64" ? "base64" : "utf8"));
      }),
    );
  }
  return { commit, tree: tree.sha, files };
}

function walk(dir: string, base: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? walk(full, base) : [path.relative(base, full).split(path.sep).join("/")];
  });
}

let chain: Promise<unknown> = Promise.resolve();

/** SHORTLIST_ROOT is process wide, so every pipeline call runs one at a time. */
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn);
  chain = run.catch(() => undefined);
  return run;
}

async function inScratch<T>(snap: Snapshot, fn: () => T | Promise<T>): Promise<{ result: T; changed: Map<string, Buffer> }> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "shortlist-"));
  try {
    for (const [rel, sha] of snap.files) {
      const dest = path.join(dir, rel);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, blobCache.get(sha)!);
    }
    const prev = process.env.SHORTLIST_ROOT;
    process.env.SHORTLIST_ROOT = dir;
    let result: T;
    try {
      result = await fn();
    } finally {
      if (prev === undefined) delete process.env.SHORTLIST_ROOT;
      else process.env.SHORTLIST_ROOT = prev;
    }
    const changed = new Map<string, Buffer>();
    for (const top of SYNC) {
      for (const rel of walk(path.join(/*turbopackIgnore: true*/ dir, top), dir)) {
        if (rel.endsWith(".tmp")) continue;
        const bytes = fs.readFileSync(path.join(dir, rel));
        if (snap.files.get(rel) !== gitSha(bytes)) changed.set(rel, bytes);
      }
    }
    return { result, changed };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/** Runs read-only pipeline code against the latest files on the branch. */
export function readState<T>(fn: () => T | Promise<T>): Promise<T> {
  const cfg = repoConfig();
  if (!cfg) return serial(async () => fn());
  return serial(async () => (await inScratch(await snapshot(cfg), fn)).result);
}

/**
 * Runs pipeline code that changes state and commits the result. If a scheduled
 * run pushed in between, the step is replayed on the newer files.
 */
export function writeState<T>(message: string, fn: () => T | Promise<T>): Promise<T> {
  const cfg = repoConfig();
  if (!cfg) return serial(async () => fn());
  return serial(async () => {
    for (let attempt = 0; ; attempt++) {
      const snap = await snapshot(cfg);
      const { result, changed } = await inScratch(snap, fn);
      if (changed.size === 0) return result;
      const tree = await gh<{ sha: string }>(cfg, "POST", "/git/trees", {
        base_tree: snap.tree,
        tree: [...changed].map(([p, bytes]) => ({ path: p, mode: "100644", type: "blob", content: bytes.toString("utf8") })),
      });
      const commit = await gh<{ sha: string }>(cfg, "POST", "/git/commits", {
        message: `Dashboard: ${message}`,
        tree: tree.sha,
        parents: [snap.commit],
      });
      try {
        await gh(cfg, "PATCH", `/git/refs/heads/${encodeURIComponent(cfg.branch)}`, { sha: commit.sha, force: false });
        return result;
      } catch (err) {
        if (!(err instanceof GitHubError) || err.status !== 422 || attempt >= 2) throw err;
      }
    }
  });
}
