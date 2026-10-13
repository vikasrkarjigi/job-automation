import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { toInstant } from "../bot/lib/inbox.ts";
import { roleForName } from "../bot/lib/roles.ts";
import { dueSlot, localTime } from "../bot/lib/schedule.ts";
import { loadAnswers, saveAnswer } from "../src/apply.ts";
import { parseResume, resumeAsText } from "../src/resume-view.ts";
import { tempRoot } from "./helpers.ts";

const REPO = path.resolve(__dirname, "..");

afterEach(() => {
  delete process.env.SHORTLIST_TZ;
  delete process.env.SHORTLIST_RUN_HOURS;
});

describe("resume view", () => {
  const base = fs.readFileSync(path.join(REPO, "fixtures", "demo", "profile", "base.tex"), "utf8");

  it("reads sections, entries, bullets, and skills from the template", () => {
    const doc = parseResume(base);
    expect(doc.header[0]).toBe("Your Name");
    expect(doc.sections.map((s) => s.title)).toEqual(["Experience", "Projects", "Skills"]);
    const exp = doc.sections[0].blocks;
    expect(exp[0]).toMatchObject({ kind: "entry", parts: ["AI Engineer", "Example Analytics", "2024 to Present"] });
    const bullet = exp.find((b) => b.kind === "bullet");
    expect(bullet && bullet.kind === "bullet" && bullet.runs.filter((r) => r.bold).map((r) => r.text)).toEqual(["RAG"]);
  });

  it("marks new bullets, reworded bullets, and added skills against the base", () => {
    const tailored = base
      .replace("LangChain and Pinecone", "LangChain and FAISS")
      .replace("Pinecone, FastAPI", "FAISS, FastAPI")
      .replace(
        /^\s*%% tailor:bullets\s*$/m,
        "  %% tailor:bullets\n  \\resumeItem{Cached frequent retrieval results in \\textbf{Redis} behind a FastAPI gateway, trimming p95 latency from 2.4 seconds to 0.9 seconds.}",
      );
    const doc = parseResume(tailored, base);
    expect(doc.changes).toEqual({ newBullets: 1, editedBullets: 1, addedSkills: ["FAISS"] });
    const text = resumeAsText(doc);
    expect(text).toContain("Redis behind a FastAPI gateway");
    expect(text).toContain("[added by tailor]");
    expect(text).toContain("FAISS [added]");
  });

  it("parses the real profile resume with both tailor markers", () => {
    const tex = fs.readFileSync(path.join(REPO, "profile", "base.tex"), "utf8");
    expect(tex).toMatch(/^\s*%% tailor:bullets\s*$/m);
    expect(tex).toMatch(/\S.*%% tailor:skills/);
    const doc = parseResume(tex);
    expect(doc.header[0]).toBe("Vikas Ravikumar Karjigi");
    expect(doc.sections.map((s) => s.title)).toContain("Experience");
    expect(resumeAsText(doc)).not.toMatch(/\\\\|\\textbf/);
  });
});

describe("saved application answers", () => {
  it("fills an existing blank and adds a new question", () => {
    tempRoot();
    saveAnswer("salary", "120000");
    saveAnswer("custom_clearance", "No", "Do you hold a security clearance?");
    const answers = loadAnswers();
    expect(answers.get("salary")?.answer).toBe("120000");
    expect(answers.get("custom_clearance")).toMatchObject({ question: "Do you hold a security clearance?", answer: "No" });
    expect(() => saveAnswer("not_a_key", "x")).toThrow(/Pass the question/);
  });
});

describe("posting times", () => {
  const now = new Date("2026-10-13T12:00:00Z");
  it("turns board relative times into instants", () => {
    expect(toInstant("3 hours ago", now)).toBe("2026-10-13T09:00:00.000Z");
    expect(toInstant("45 minutes ago", now)).toBe("2026-10-13T11:15:00.000Z");
    expect(toInstant("1 day ago", now)).toBe("2026-10-12T12:00:00.000Z");
    expect(toInstant("Just now", now)).toBe(now.toISOString());
    expect(toInstant("2026-10-13T08:30:00Z", now)).toBe("2026-10-13T08:30:00.000Z");
    expect(toInstant("Reposted recently", now)).toBeNull();
    expect(toInstant(null, now)).toBeNull();
  });
});

describe("schedule slots", () => {
  it("runs at 4 am, 12 pm, and 8 pm Chicago time by default, across daylight saving", () => {
    expect(dueSlot(new Date("2026-10-13T09:00:00Z"))).toMatchObject({ label: "4 am", key: "2026-10-13@4" });
    expect(dueSlot(new Date("2026-10-13T17:00:00Z"))).toMatchObject({ label: "12 pm" });
    expect(dueSlot(new Date("2026-10-14T01:00:00Z"))).toMatchObject({ label: "8 pm", key: "2026-10-13@20" });
    expect(dueSlot(new Date("2026-12-01T10:00:00Z"))).toMatchObject({ label: "4 am" });
    expect(dueSlot(new Date("2026-10-13T10:00:00Z"))).toBeNull();
  });

  it("honors SHORTLIST_TZ and SHORTLIST_RUN_HOURS", () => {
    process.env.SHORTLIST_TZ = "America/New_York";
    process.env.SHORTLIST_RUN_HOURS = "7";
    expect(localTime(new Date("2026-10-13T11:00:00Z")).hour).toBe(7);
    expect(dueSlot(new Date("2026-10-13T11:00:00Z"))).toMatchObject({ label: "7 am" });
    expect(dueSlot(new Date("2026-10-13T09:00:00Z"))).toBeNull();
  });
});

describe("channel roles", () => {
  it("maps channel names to roles", () => {
    expect(roleForName("#scout")).toBe("scout");
    expect(roleForName("tracker")).toBe("tracker");
    expect(roleForName("shortlist-apply")).toBe("apply");
    expect(roleForName("general")).toBeUndefined();
  });
});
