import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { HostFilesApi } from "@cursor/bdk";
import { dayKey } from "../../src/tracker.ts";

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const PREFIX = "shortlist/";
const SCOPE = { scope: "deployment" } as const;
const SEED_DIRS = ["profile", "agents"];
const SYNC_DIRS = ["profile", "agents", "data", "resumes", "tracker"];

type Files = Pick<HostFilesApi, "list" | "read" | "readBytes" | "write" | "remove">;

const hash = (b: Uint8Array) => crypto.createHash("sha1").update(b).digest("hex");

function walk(dir: string, base = dir): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? walk(full, base) : [path.relative(base, full)];
  });
}

/**
 * Older inbox days and resumes are never needed to run a step, so they stay in
 * the store and are read on demand. That keeps each call to a few dozen files.
 */
function wanted(rel: string, now: Date): boolean {
  if (rel.startsWith("resumes/")) return false;
  const inbox = rel.match(/^data\/inbox\/(\d{4}-\d{2}-\d{2})\//);
  if (inbox) {
    const yesterday = dayKey(new Date(now.getTime() - 86_400_000));
    return inbox[1] === dayKey(now) || inbox[1] === yesterday;
  }
  return true;
}

let chain: Promise<unknown> = Promise.resolve();

/**
 * Runs pipeline code against a scratch copy of the durable store. The pipeline
 * reads and writes plain files under SHORTLIST_ROOT; this hydrates that root
 * from `ctx.host.files`, runs `fn`, and writes back every file that changed.
 * Calls are serialized because SHORTLIST_ROOT is process wide.
 */
export function withState<T>(files: Files, fn: (root: string) => T | Promise<T>, now = new Date()): Promise<T> {
  const run = chain.then(async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "shortlist-"));
    const before = new Map<string, string>();
    try {
      for (const dir of SEED_DIRS) {
        const src = path.join(REPO_ROOT, dir);
        if (fs.existsSync(src)) fs.cpSync(src, path.join(root, dir), { recursive: true });
      }
      const stored = (await files.list(PREFIX, SCOPE)).map((e) => e.path.slice(PREFIX.length)).filter((rel) => wanted(rel, now));
      await Promise.all(
        stored.map(async (rel) => {
          const bytes = await files.readBytes(PREFIX + rel, SCOPE);
          if (!bytes) return;
          const dest = path.join(root, rel);
          fs.mkdirSync(path.dirname(dest), { recursive: true });
          fs.writeFileSync(dest, bytes);
          before.set(rel, hash(bytes));
        }),
      );

      const prev = process.env.SHORTLIST_ROOT;
      process.env.SHORTLIST_ROOT = root;
      let result: T;
      try {
        result = await fn(root);
      } finally {
        if (prev === undefined) delete process.env.SHORTLIST_ROOT;
        else process.env.SHORTLIST_ROOT = prev;
      }

      const after = SYNC_DIRS.flatMap((d) => walk(path.join(root, d)).map((rel) => path.join(d, rel)));
      await Promise.all(
        after.map(async (rel) => {
          const bytes = fs.readFileSync(path.join(root, rel));
          const h = hash(bytes);
          if (before.get(rel) === h) return;
          if (!before.has(rel) && SEED_DIRS.some((d) => rel.startsWith(d + "/"))) {
            const seed = path.join(REPO_ROOT, rel);
            if (fs.existsSync(seed) && hash(fs.readFileSync(seed)) === h) return;
          }
          await files.write(PREFIX + rel, bytes, SCOPE);
        }),
      );
      const present = new Set(after);
      await Promise.all([...before.keys()].filter((rel) => !present.has(rel)).map((rel) => files.remove(PREFIX + rel, SCOPE)));
      return result;
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
  chain = run.catch(() => undefined);
  return run;
}

export async function readStored(files: Files, rel: string): Promise<string | undefined> {
  const stored = await files.read(PREFIX + rel, SCOPE);
  if (stored !== undefined) return stored;
  const seed = path.join(REPO_ROOT, rel);
  return fs.existsSync(seed) ? fs.readFileSync(seed, "utf8") : undefined;
}

export async function listStored(files: Files, dir: string): Promise<string[]> {
  return (await files.list(PREFIX + dir, SCOPE)).map((e) => e.path.slice(PREFIX.length));
}
