import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { extractKeywords, gate, scoreJob } from "../src/ats";
import { approve, confirmKeyword, markReady, markSubmitted, runMorning } from "../src/orchestrator";
import { loadBaseResume, loadConfirmations, loadEvidence } from "../src/profile";
import { DEFAULT_SETTINGS } from "../src/settings";
import { checkBullet, tailorResume } from "../src/tailor";
import { dayKey, loadTracker } from "../src/tracker";
import { posting, tempRoot, writeInbox } from "./helpers";

const ctx = () => ({ evidence: loadEvidence(), confirmations: loadConfirmations(), preferredWeight: 0.4 });

describe("required versus preferred", () => {
  beforeEach(() => {
    tempRoot();
  });

  it("weights headed sections 1 and 0.4", () => {
    const { split, keywords } = extractKeywords("Requirements:\n- Python and PyTorch\n\nNice to have:\n- MLflow", 0.4);
    expect(split).toBe("headings");
    expect(keywords.find((k) => k.term === "Python")?.weight).toBe(1);
    expect(keywords.find((k) => k.term === "MLflow")?.weight).toBe(0.4);
  });

  it("treats every keyword as required when the posting does not separate them", () => {
    const { split, keywords } = extractKeywords("You will use Python, PyTorch, MLflow, and Docker every day. Python matters most.", 0.4);
    expect(split).toBe("undivided");
    expect(keywords.every((k) => k.tier === "required" && k.weight === 1)).toBe(true);
    expect(keywords[0].term).toBe("Python");
  });

  it("gives the same integer for the same job and resume every time", () => {
    const d = "Requirements:\n- Python, LLM, RAG, FAISS\n\nPreferred:\n- Redis, Spark";
    const base = loadBaseResume();
    const runs = Array.from({ length: 5 }, () => scoreJob(d, base, ctx()).score);
    expect(new Set(runs).size).toBe(1);
    expect(Number.isInteger(runs[0])).toBe(true);
  });

  it("does not count a skill with no evidence as a hit", () => {
    const r = scoreJob("Requirements:\n- Python\n- Kubernetes", loadBaseResume(), ctx());
    expect(r.matched).toEqual(["Python"]);
    expect(r.needsConfirm).toEqual(["Kubernetes"]);
    expect(r.score).toBe(50);
  });
});

describe("gate", () => {
  beforeEach(() => {
    tempRoot();
  });

  it("ignores a job whose honest ceiling is under 80", () => {
    const r = scoreJob("Requirements:\n- Python, LLM\n\nPreferred:\n- Spark, Airflow, Azure, Java, Kotlin, Scala, Go, Rust, Spark, Computer Vision, Milvus, GCP", loadBaseResume(), ctx());
    const g = gate(r, DEFAULT_SETTINGS);
    expect(g.decision).toBe("ignore");
  });

  it("ignores a job with a required skill you declined", () => {
    confirmKeyword("Kubernetes", "no");
    const r = scoreJob("Requirements:\n- Python, LLM, RAG, Docker, AWS, Kubernetes", loadBaseResume(), ctx());
    expect(gate(r, DEFAULT_SETTINGS)).toEqual({ decision: "ignore", reason: "required skill you declined: Kubernetes" });
  });

  it("asks about a single unknown required skill when that answer can decide the job", () => {
    const r = scoreJob("Requirements:\n- Python, LLM, RAG, Docker, AWS, Kubernetes", loadBaseResume(), ctx());
    expect(gate(r, DEFAULT_SETTINGS)).toEqual({ decision: "confirm", keywords: ["Kubernetes"] });
  });

  it("tailors from a starting score under 68 when evidence lifts it over 80", () => {
    const r = scoreJob("Requirements:\n- Python, LLM, LlamaIndex, Weaviate, Docker, RAG", loadBaseResume(), ctx());
    expect(r.score).toBeLessThan(68);
    expect(r.ceiling).toBe(100);
    expect(gate(r, DEFAULT_SETTINGS).decision).toBe("tailor");
  });
});

describe("tailor", () => {
  let root: string;
  beforeEach(() => {
    root = tempRoot();
  });

  it("renames Pinecone to FAISS in the job copy and leaves the base resume alone", () => {
    const base = loadBaseResume();
    const r = scoreJob("Requirements:\n- Python, RAG, FAISS", base, ctx());
    expect(r.renames).toEqual([{ from: "Pinecone", to: "FAISS" }]);
    const t = tailorResume(base, r, loadEvidence(), loadConfirmations());
    expect(t.tex).toContain("FAISS");
    expect(t.tex).not.toMatch(/Pinecone/);
    expect(loadBaseResume()).toContain("Pinecone");
    expect(t.missingRequired).toEqual([]);
  });

  it("does not rename away a skill the job also asks for", () => {
    const r = scoreJob("Requirements:\n- Pinecone and FAISS", loadBaseResume(), ctx());
    expect(r.renames).toEqual([]);
    expect(r.needsConfirm).toEqual(["FAISS"]);
  });

  it("asks once, remembers the yes, and does not ask on the next job", () => {
    const now = new Date();
    const desc = "Requirements:\n- 1+ years of experience with Python, LLM, RAG, Docker, AWS, Kubernetes";
    writeInbox(root, dayKey(now), "indeed", 1, [posting({ company: "First", description: desc })]);
    expect(runMorning({ now }).needsConfirm.map((j) => j.keywords)).toEqual([["Kubernetes"]]);

    confirmKeyword("Kubernetes", "yes", "ran the gateway on EKS");
    const first = loadTracker().jobs.find((j) => j.company === "First")!;
    expect(first.stage).toBe("awaiting_approval");
    expect(fs.readFileSync(path.join(root, first.resumePath!), "utf8")).toContain("Kubernetes");
    expect(fs.readFileSync(path.join(root, "profile", "confirmed-keywords.md"), "utf8")).toContain("- Kubernetes: yes | ran the gateway on EKS");

    writeInbox(root, dayKey(now), "indeed", 2, [posting({ company: "Second", description: desc })]);
    const second = runMorning({ now });
    expect(second.needsConfirm).toEqual([]);
    expect(loadTracker().jobs.find((j) => j.company === "Second")?.stage).toBe("awaiting_approval");
  });

  it("freezes the exact resume the recruiter saw", () => {
    const now = new Date();
    writeInbox(root, dayKey(now), "indeed", 1, [posting({ description: "Requirements:\n- Python, RAG, FAISS, LLM, Docker" })]);
    runMorning({ now });
    const job = loadTracker().jobs[0];
    approve(job.id);
    markReady(job.id);
    const submitted = markSubmitted(job.id);
    expect(submitted.submittedResumePath).toBe(`resumes/${job.id}.tex`);
    const sent = fs.readFileSync(path.join(root, submitted.submittedResumePath!), "utf8");

    fs.appendFileSync(path.join(root, "profile", "base.tex"), "\n%% edited later\n");
    runMorning({ now });
    expect(fs.readFileSync(path.join(root, submitted.submittedResumePath!), "utf8")).toBe(sent);
  });

  it("refuses to submit before the form is ready", () => {
    const now = new Date();
    writeInbox(root, dayKey(now), "indeed", 1, [posting()]);
    runMorning({ now });
    const job = loadTracker().jobs[0];
    approve(job.id);
    expect(() => markSubmitted(job.id)).toThrow(/not ready to submit/);
  });
});

describe("bullet checker", () => {
  beforeEach(() => {
    tempRoot();
  });

  const allowed = new Set(["Python", "LLM", "RAG", "Redis", "FastAPI"]);
  const good =
    "Cached frequent retrieval results in \\textbf{Redis} behind a FastAPI gateway, trimming p95 latency of the question answering endpoint from 2.4 seconds to 0.9 seconds at a peak of 300 requests per minute during weekday hours.";

  it("passes a bullet that follows every rule", () => {
    expect(checkBullet(good, [], allowed)).toMatchObject({ ok: true });
  });

  it("rejects length, hyphens, bold count, reused verbs, and invented skills", () => {
    expect(checkBullet("Cached \\textbf{Redis} results.", [], allowed).errors[0]).toMatch(/length/);
    expect(checkBullet(good.replace("question answering", "question-answering"), [], allowed).errors).toContain("contains a hyphen or dash");
    expect(checkBullet(good.replace("\\textbf{Redis}", "Redis"), [], allowed).errors.join()).toMatch(/0 bold/);
    expect(checkBullet(good, ["Cached something else"], allowed).errors.join()).toMatch(/verb "cached"/);
    expect(checkBullet(good.replace("FastAPI", "Kubernetes"), [], allowed).errors.join()).toMatch(/Kubernetes/);
  });
});
