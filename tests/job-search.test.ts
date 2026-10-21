import { describe, expect, it } from "vitest";
import { filterJobsBySearch, scoreJobSearch } from "../src/job-search.ts";
import type { JobRow } from "../src/types.ts";

const base = (): JobRow => ({
  id: "american-express-ai-engineer-abc123",
  company: "American Express",
  title: "AI Engineer",
  city: "Palo Alto",
  location: "Palo Alto, CA",
  sources: [{ board: "indeed", url: "https://example.com" }],
  postedAt: "2026-10-20T00:00:00Z",
  description: "",
  stage: "awaiting_approval",
  filterPassed: true,
  reason: null,
  analysis: null,
  scoreBefore: 90,
  scoreAfter: 93,
  resumePath: "resumes/x.tex",
  tailorNotes: [],
  writerModel: null,
  approvedAt: null,
  applyPacket: null,
  submittedAt: null,
  submittedResumePath: null,
  people: [],
  history: [],
  createdAt: "2026-10-20T00:00:00Z",
});

describe("job search", () => {
  it("matches partial company and multi-word queries", () => {
    const job = base();
    expect(scoreJobSearch(job, "amex")).toBeGreaterThan(0);
    expect(scoreJobSearch(job, "american palo")).toBeGreaterThan(0);
    expect(filterJobsBySearch([job], "engineer express").length).toBe(1);
  });

  it("allows minor typos on long tokens", () => {
    const job = base();
    expect(scoreJobSearch(job, "americn express")).toBeGreaterThan(0);
  });

  it("returns empty when a token matches nothing", () => {
    const job = base();
    expect(filterJobsBySearch([job], "engineer zzznomatch")).toHaveLength(0);
  });
});
