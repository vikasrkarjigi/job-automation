import { beforeEach, describe, expect, it } from "vitest";
import { answerFor, isOpenEnded, isWhyRole, loadAnswers } from "../src/apply.ts";
import { answerQuestion, runMorning, saveWritten } from "../src/orchestrator.ts";
import { dayKey, loadTracker } from "../src/tracker.ts";
import type { JobRow } from "../src/types.ts";
import { checkWritten, writingBrief } from "../src/writer.ts";
import { posting, tempRoot, writeInbox } from "./helpers.ts";

const WHY =
  "Northwind Labs is building retrieval for support teams, which is the problem I have spent the last two years on. " +
  "At my last role I built a RAG service in Python with LangChain and Pinecone that answered 4,000 weekly support questions " +
  "and cut median handling time by 38 percent. I also wrote the guardrails for an LLM triage assistant that routed 70 percent " +
  "of tickets without a human. What I like about this role is that the posting cares about evaluation and uptime, not just demos. " +
  "I'd want to work on making answers measurably more grounded for your customers, and on the FastAPI and Docker side that keeps them fast.";

describe("open ended questions", () => {
  it("are written per job, never reused or blocked", () => {
    tempRoot();
    const answers = loadAnswers();
    expect(isWhyRole("Why are you interested in this role?")).toBe(true);
    expect(isWhyRole("Why do you want to work at Acme?")).toBe(true);
    expect(isOpenEnded("Describe a project you are proud of")).toBe(true);
    expect(isOpenEnded("Desired salary")).toBe(false);
    expect(answerFor("Why are you interested in this role?", answers)).toMatchObject({ ok: false, write: true });
    expect(answerFor("Tell us about a time you shipped under pressure", answers)).toMatchObject({ ok: false, write: true });
    expect(answerFor("What is your favorite color?", answers)).toMatchObject({ ok: false, reason: "new question, added to apply.md" });
  });
});

describe("written answers", () => {
  let job: JobRow;
  beforeEach(() => {
    const root = tempRoot();
    const now = new Date();
    writeInbox(root, dayKey(now), "indeed", 1, [
      posting({
        company: "Northwind Labs",
        description: "We build retrieval for support teams.\nRequirements:\n- Python, LLM, RAG, LangChain, FastAPI, Docker\nOur customers rely on grounded answers.",
      }),
    ]);
    for (const b of ["linkedin", "jobright"]) writeInbox(root, dayKey(now), b, 1, []);
    runMorning({ now });
    job = loadTracker().jobs.find((j) => j.company === "Northwind Labs")!;
  });

  it("brief carries the posting, the closest resume results, and the style guide", () => {
    const brief = writingBrief(job, "Why are you interested in this role?");
    expect(brief.words).toEqual([90, 150]);
    expect(brief.posting.some((l) => /support teams/.test(l))).toBe(true);
    expect(brief.evidence[0].text).toMatch(/RAG|LLM|FastAPI/);
    expect(brief.style).toContain("Writing style");
  });

  it("passes a specific, human answer", () => {
    expect(checkWritten(WHY, "Why are you interested in this role?", job)).toMatchObject({ ok: true });
  });

  it("rejects answers that sound generated or claim skills without evidence", () => {
    const generated =
      "I am thrilled to apply for this unique opportunity! As a passionate engineer, I leverage cutting edge AI to deliver robust, seamless solutions — and I believe I would be a perfect fit for your dynamic team. " +
      WHY.replace("Northwind Labs", "your company");
    const check = checkWritten(generated, "Why are you interested in this role?", job);
    expect(check.ok).toBe(false);
    expect(check.problems.join(" ")).toMatch(/sounds generated/);
    expect(check.problems.join(" ")).toMatch(/dash/);
    expect(check.problems.join(" ")).toMatch(/exclamation/);
    expect(check.problems.join(" ")).toMatch(/does not name Northwind Labs/);
    const invented = checkWritten(WHY.replace("Docker side", "Kubernetes and Rust side"), "Why are you interested in this role?", job);
    expect(invented.problems.join(" ")).toMatch(/without evidence: .*Kubernetes/);
  });

  it("saves only passing drafts, then answers the form from them", () => {
    expect(saveWritten(job.id, "Why are you interested in this role?", "I am excited to join!").ok).toBe(false);
    expect(answerQuestion(job.id, "Why are you interested in this role?")).toMatchObject({ ok: false, write: true });
    expect(saveWritten(job.id, "Why are you interested in this role?", WHY).ok).toBe(true);
    expect(answerQuestion(job.id, "Why are you interested in this role?")).toMatchObject({ ok: true, answer: WHY });
    expect(loadTracker().jobs.find((j) => j.id === job.id)!.stage).not.toBe("apply_blocked");
  });

  it("keeps your edit as written", () => {
    saveWritten(job.id, "Why are you interested in this role?", WHY);
    saveWritten(job.id, "Why are you interested in this role?", "Short and mine.", "you");
    const w = loadTracker().jobs.find((j) => j.id === job.id)!.written!;
    expect(w).toHaveLength(1);
    expect(w[0]).toMatchObject({ answer: "Short and mine.", by: "you" });
  });
});
