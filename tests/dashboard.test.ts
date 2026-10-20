import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { answerSections } from "../src/apply.ts";
import { trackerWorkbook } from "../src/export-xlsx.ts";
import { approve, runMorning } from "../src/orchestrator.ts";
import { readResume } from "../src/resume-data.ts";
import { renderResumePdf } from "../src/resume-pdf.ts";
import { parseResume } from "../src/resume-view.ts";
import { statusLine } from "../src/status.ts";
import { readState, writeState } from "../src/store.ts";
import { dayKey, loadTracker } from "../src/tracker.ts";
import { posting, tempRoot, writeInbox } from "./helpers.ts";

const sha = (s: Buffer | string) => crypto.createHash("sha1").update(String(Math.random())).update(s).digest("hex");
const blobSha = (b: Buffer) => crypto.createHash("sha1").update(`blob ${b.length}\0`).update(b).digest("hex");

/** Just enough of the GitHub git data API for the dashboard store. */
function fakeGitHub(files: Map<string, Buffer>) {
  const blobs = new Map<string, Buffer>();
  const trees = new Map<string, Map<string, string>>();
  const commits = new Map<string, { tree: string; message: string }>();
  const putTree = (entries: Map<string, string>) => {
    const id = sha("tree");
    trees.set(id, entries);
    return id;
  };
  const initial = new Map<string, string>();
  for (const [p, bytes] of files) {
    const id = blobSha(bytes);
    blobs.set(id, bytes);
    initial.set(p, id);
  }
  let head = sha("commit");
  commits.set(head, { tree: putTree(initial), message: "initial" });
  let rejectNextPatch = 0;

  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

  const handler = async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    const route = url.pathname.replace(/^\/repos\/[^/]+\/[^/]+/, "");
    const method = init?.method ?? "GET";
    const body = init?.body ? JSON.parse(String(init.body)) : null;
    if (method === "GET" && route === "/git/ref/heads/main") return json({ object: { sha: head } });
    const tree = route.match(/^\/git\/trees\/(\w+)$/);
    if (method === "GET" && tree) {
      const c = commits.get(tree[1])!;
      const entries = trees.get(c.tree)!;
      return json({ sha: c.tree, truncated: false, tree: [...entries].map(([p, s]) => ({ path: p, type: "blob", sha: s })) });
    }
    const blob = route.match(/^\/git\/blobs\/(\w+)$/);
    if (method === "GET" && blob) return json({ content: blobs.get(blob[1])!.toString("base64"), encoding: "base64" });
    if (method === "POST" && route === "/git/trees") {
      const entries = new Map(trees.get(body.base_tree)!);
      for (const e of body.tree) {
        const bytes = Buffer.from(e.content);
        const id = blobSha(bytes);
        blobs.set(id, bytes);
        entries.set(e.path, id);
      }
      return json({ sha: putTree(entries) }, 201);
    }
    if (method === "POST" && route === "/git/commits") {
      const id = sha("commit");
      commits.set(id, { tree: body.tree, message: body.message });
      return json({ sha: id }, 201);
    }
    if (method === "PATCH" && route === "/git/refs/heads/main") {
      if (rejectNextPatch > 0) {
        rejectNextPatch--;
        return json({ message: "Update is not a fast forward" }, 422);
      }
      head = body.sha;
      return json({ object: { sha: head } });
    }
    return json({ message: `unhandled ${method} ${route}` }, 404);
  };

  return {
    handler,
    head: () => commits.get(head)!,
    file: (p: string) => {
      const id = trees.get(commits.get(head)!.tree)!.get(p);
      return id ? blobs.get(id)!.toString("utf8") : undefined;
    },
    rejectNext: (n: number) => (rejectNextPatch = n),
  };
}

function walk(dir: string, base = dir): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? walk(full, base) : [path.relative(base, full)];
  });
}

function shortlistedRoot() {
  const root = tempRoot();
  const now = new Date();
  writeInbox(root, dayKey(now), "indeed", 1, [posting({ company: "Northwind Labs", description: "Requirements:\n- Python, PyTorch, LLM, RAG, FastAPI, Docker" })]);
  for (const b of ["linkedin", "jobright"]) writeInbox(root, dayKey(now), b, 1, []);
  runMorning({ now });
  return root;
}

describe("dashboard store on GitHub", () => {
  let gh: ReturnType<typeof fakeGitHub>;
  let jobId: string;

  beforeEach(() => {
    const root = shortlistedRoot();
    const job = loadTracker().jobs.find((j) => j.stage === "awaiting_approval");
    expect(job).toBeTruthy();
    jobId = job!.id;
    const files = new Map<string, Buffer>();
    for (const rel of walk(root)) if (!rel.startsWith("fixtures")) files.set(rel, fs.readFileSync(path.join(root, rel)));
    files.set("src/ignored.ts", Buffer.from("export {};"));
    delete process.env.SHORTLIST_ROOT;
    gh = fakeGitHub(files);
    vi.stubGlobal("fetch", vi.fn(gh.handler));
    process.env.SHORTLIST_GITHUB_TOKEN = "test-token";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.SHORTLIST_GITHUB_TOKEN;
  });

  it("reads the pipeline from the branch", async () => {
    const data = await readState(() => loadTracker());
    expect(data.jobs.some((j) => j.id === jobId)).toBe(true);
    expect(process.env.SHORTLIST_ROOT).toBeUndefined();
  });

  it("commits only the files a step changed", async () => {
    await writeState(`Approved ${jobId}`, () => approve(jobId));
    expect(gh.head().message).toBe(`Dashboard: Approved ${jobId}`);
    const saved = JSON.parse(gh.file("data/tracker.json")!);
    expect(saved.jobs.find((j: { id: string }) => j.id === jobId).stage).toBe("approved");
    expect(gh.file("src/ignored.ts")).toBe("export {};");
  });

  it("replays the step when a scheduled run pushed first", async () => {
    gh.rejectNext(1);
    await writeState("approve", () => approve(jobId));
    expect(JSON.parse(gh.file("data/tracker.json")!).jobs.find((j: { id: string }) => j.id === jobId).stage).toBe("approved");
  });

  it("does not commit when nothing changed", async () => {
    const before = gh.head();
    await writeState("noop", () => loadTracker());
    expect(gh.head()).toBe(before);
  });

  it("loads the exact tailored resume", async () => {
    const r = await readState(() => readResume(jobId));
    expect(r.tex).toContain("\\begin{document}");
    expect(r.rel).toBe(`resumes/${jobId}.tex`);
  });
});

describe("dashboard exports", () => {
  beforeEach(() => {
    shortlistedRoot();
  });

  it("draws the tailored resume as a PDF", async () => {
    const job = loadTracker().jobs.find((j) => j.resumePath)!;
    const { tex, base } = readResume(job.id);
    const bytes = await renderResumePdf(parseResume(tex!, base), job.title);
    expect(Buffer.from(bytes).subarray(0, 5).toString()).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(1500);
  });

  it("writes every job, with the reason, to Excel", async () => {
    const data = loadTracker();
    const book = await trackerWorkbook(data, "https://example.app");
    expect(book.subarray(0, 2).toString()).toBe("PK");
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(book as unknown as ArrayBuffer);
    expect(wb.worksheets.map((w) => w.name)).toEqual(["All jobs", "Applied", "Not applied", "Outreach", "Runs"]);
    expect(wb.getWorksheet("All jobs")!.rowCount).toBe(data.jobs.length + 1);
    expect(String(wb.getWorksheet("All jobs")!.getRow(2).getCell(5).value)).toBe(statusLine(data.jobs.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]));
  });

  it("groups apply answers by heading for the form", () => {
    const md = fs.readFileSync(path.join(process.env.SHORTLIST_ROOT!, "agents", "apply.md"), "utf8");
    const sections = answerSections(md);
    expect(sections.map((s) => s.title)).toContain("Saved answers");
    expect(sections.flatMap((s) => s.answers).some((a) => a.key === "salary")).toBe(true);
  });
});
