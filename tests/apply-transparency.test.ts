import { describe, expect, it } from "vitest";
import { applyStatusLine, isApplyStale, jobApplyInsight } from "../src/apply-transparency.ts";
import type { JobRow } from "../src/types.ts";

function job(partial: Partial<JobRow>): JobRow {
  return {
    id: "j1",
    company: "Acme",
    title: "AI Engineer",
    city: "SF",
    location: "SF, CA",
    sources: [{ board: "indeed", url: "https://apply.example.com/job" }],
    postedAt: new Date().toISOString(),
    description: "",
    stage: "approved",
    filterPassed: true,
    reason: null,
    analysis: null,
    scoreBefore: 90,
    scoreAfter: 95,
    resumePath: "resumes/j1.tex",
    tailorNotes: [],
    writerModel: null,
    approvedAt: new Date().toISOString(),
    applyPacket: null,
    submittedAt: null,
    submittedResumePath: null,
    people: [],
    history: [{ at: new Date().toISOString(), stage: "approved", note: "you approved the tailored resume" }],
    createdAt: new Date().toISOString(),
    ...partial,
  };
}

describe("apply transparency", () => {
  it("marks approved jobs stale after 2h", () => {
    const old = new Date(Date.now() - 3 * 3_600_000).toISOString();
    expect(isApplyStale(job({ history: [{ at: old, stage: "approved", note: "x" }] }))).toBe(true);
  });

  it("explains when no apply agent is running", () => {
    const line = applyStatusLine(job({}), { live: false, url: null, startedAt: null, status: null });
    expect(line).toMatch(/waiting for the apply agent/i);
  });

  it("shows watch hint when apply run is live", () => {
    const insight = jobApplyInsight(job({}), { live: true, url: "https://cursor.com/agents/x", startedAt: new Date().toISOString(), status: "RUNNING" });
    expect(insight.summary).toMatch(/running now/i);
    expect(insight.agentWatchUrl).toBe("https://cursor.com/agents/x");
  });
});
