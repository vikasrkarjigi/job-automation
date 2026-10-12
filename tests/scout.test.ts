import { beforeEach, describe, expect, it } from "vitest";
import { runMorning } from "../src/orchestrator";
import { checkAgency, checkExperience, checkSponsorship, checkTitle, dedupe, isFresh } from "../src/scout";
import { dayKey, loadTracker } from "../src/tracker";
import type { RawPosting } from "../src/types";
import { posting, tempRoot, writeInbox } from "./helpers";

describe("fetch filters", () => {
  it("keeps only posts under 24 hours old and drops posts with no timestamp", () => {
    const now = new Date("2026-10-12T12:00:00Z");
    expect(isFresh("2026-10-12T00:00:01Z", now, 24)).toBe(true);
    expect(isFresh("2026-10-11T12:00:00Z", now, 24)).toBe(false);
    expect(isFresh("2026-10-10T12:00:00Z", now, 24)).toBe(false);
    expect(isFresh(null, now, 24)).toBe(false);
  });

  it("accepts the AI engineer title list and rejects senior or non engineer titles", () => {
    for (const t of ["AI Engineer", "AI/ML Engineer", "Software Engineer (AI/ML)", "Applied AI Engineer", "Machine Learning Engineer", "LLM Engineer", "Generative AI Engineer"]) {
      expect(checkTitle(t), t).toBeNull();
    }
    for (const t of ["Senior AI Engineer", "Staff Machine Learning Engineer", "AI Engineering Manager", "Product Manager, AI", "Data Analyst", "Research Scientist, LLM"]) {
      expect(checkTitle(t), t).not.toBeNull();
    }
  });

  it("keeps 0 to 3 years, 2+ and 3+, and drops a floor above 3", () => {
    expect(checkExperience("Requirements:\n- 3+ years of experience with Python", 3)).toBeNull();
    expect(checkExperience("Requirements:\n- 2+ years of professional experience", 3)).toBeNull();
    expect(checkExperience("0 to 2 years of experience is a great fit.", 3)).toBeNull();
    expect(checkExperience("Requirements:\n- Python and LLM", 3)).toBeNull();
    expect(checkExperience("Requirements:\n- 4+ years of experience", 3)).toBe("requires 4+ years");
    expect(checkExperience("Requirements:\n- 5 to 7 years of industry experience", 3)).toBe("requires 5+ years");
  });

  it("ignores year counts that are not about experience", () => {
    expect(checkExperience("About us\nWe were founded 12 years ago.\n\nRequirements:\n- 1+ years of experience", 3)).toBeNull();
  });

  it("drops explicit no sponsorship and keeps silent or plain authorization", () => {
    expect(checkSponsorship("We are unable to sponsor visas.")).not.toBeNull();
    expect(checkSponsorship("Sponsorship is not available for this role.")).not.toBeNull();
    expect(checkSponsorship("Must be authorized to work without sponsorship now or in the future.")).not.toBeNull();
    expect(checkSponsorship("Must be a U.S. citizen.")).not.toBeNull();
    expect(checkSponsorship("Must be legally authorized to work in the United States.")).toBeNull();
    expect(checkSponsorship("Visa sponsorship available.")).toBeNull();
    expect(checkSponsorship("We sponsor H-1B visas.")).toBeNull();
    expect(checkSponsorship("Build RAG systems in Python.")).toBeNull();
  });

  it("drops staffing firms three ways", () => {
    expect(checkAgency("TEKsystems", "", null)).not.toBeNull();
    expect(checkAgency("Boutique Talent Co", "", "Staffing & Recruiting")).not.toBeNull();
    expect(checkAgency("Acme", "Hiring for our client, C2C ok.", "Computer Software")).not.toBeNull();
    expect(checkAgency("Acme", "Build RAG systems.", "Computer Software")).toBeNull();
  });

  it("merges the same job from several boards into one row with every source", () => {
    const a = posting({ board: "indeed", location: "San Francisco, CA" }) as RawPosting;
    const b = posting({ board: "linkedin", location: "San Francisco, California", description: "short" }) as RawPosting;
    const c = posting({ board: "jobright", company: "Acme Inc.", location: "San Francisco" }) as RawPosting;
    const merged = dedupe([a, b, c]);
    expect(merged).toHaveLength(1);
    expect(merged[0].sources.map((s) => s.board)).toEqual(["indeed", "linkedin", "jobright"]);
    expect(merged[0].description).toBe(a.description);
  });
});

describe("scout batch", () => {
  let root: string;
  beforeEach(() => {
    root = tempRoot();
  });

  it("stops at 10 jobs that pass every hard filter", () => {
    const now = new Date();
    const day = dayKey(now);
    const list = Array.from({ length: 14 }, (_, i) => posting({ company: `Company ${i}` }));
    writeInbox(root, day, "indeed", 1, list);
    const summary = runMorning({ now });
    expect(summary.passedToday).toBe(10);
    expect(summary.needMore).toBe(false);
    expect(loadTracker().jobs.filter((j) => j.filterPassed)).toHaveLength(10);
  });

  it("asks for another page below 10, and never pads once the boards run dry", () => {
    const now = new Date();
    const day = dayKey(now);
    const good = Array.from({ length: 4 }, (_, i) => posting({ company: `Good ${i}` }));
    const bad = [posting({ company: "Old", postedAt: new Date(Date.now() - 30 * 3_600_000).toISOString() }), posting({ company: "Senior", title: "Senior AI Engineer" })];
    writeInbox(root, day, "indeed", 1, [...good, ...bad]);
    const first = runMorning({ now });
    expect(first.passedToday).toBe(4);
    expect(first.needMore).toBe(true);
    expect(first.nextPages).toEqual([
      { board: "indeed", page: 2 },
      { board: "linkedin", page: 1 },
    ]);

    writeInbox(root, day, "indeed", 2, [posting({ company: "Good 4" }), posting({ company: "Good 5" })]);
    writeInbox(root, day, "indeed", 3, []);
    writeInbox(root, day, "linkedin", 1, []);
    const second = runMorning({ now });
    expect(second.nextPages).toEqual([{ board: "jobright", page: 1 }]);
    writeInbox(root, day, "jobright", 1, []);
    const third = runMorning({ now });
    expect(third.passedToday).toBe(6);
    expect(third.needMore).toBe(false);
    expect(loadTracker().jobs.some((j) => j.company === "Old")).toBe(false);
  });

  it("leaves rows alone while another run holds the lock", () => {
    const now = new Date();
    writeInbox(root, dayKey(now), "indeed", 1, [posting()]);
    runMorning({ now });
    const before = loadTracker().jobs.length;
    expect(runMorning({ now }).status).toBe("done");
    expect(loadTracker().jobs.length).toBe(before);
  });
});
