import { describe, expect, it } from "vitest";
import { applicationLinkMeta, enhanceBoardUrl, resolveApplicationUrl } from "../src/application-url.ts";
import type { JobRow } from "../src/types.ts";

function job(partial: Partial<JobRow> & Pick<JobRow, "id">): JobRow {
  return {
    company: "Acme",
    title: "Engineer",
    city: "SF",
    location: "SF",
    sources: [{ board: "linkedin", url: "https://boards.greenhouse.io/acme/jobs/123" }],
    postedAt: new Date().toISOString(),
    description: "",
    stage: "approved",
    filterPassed: true,
    reason: null,
    analysis: null,
    scoreBefore: 90,
    scoreAfter: 90,
    resumePath: "r.tex",
    tailorNotes: [],
    writerModel: null,
    approvedAt: null,
    applyPacket: {
      url: "https://boards.greenhouse.io/acme/jobs/123",
      ats: "greenhouse",
      resumePath: "r.tex",
      accountEmail: "vikasravikarjigi26@gmail.com",
      passwordSecret: "BOARD_PASSWORD",
      answers: {},
      blockedOn: null,
    },
    submittedAt: null,
    submittedResumePath: null,
    people: [],
    history: [],
    createdAt: new Date().toISOString(),
    ...partial,
  };
}

describe("application urls", () => {
  it("prefers submit page url", () => {
    const j = job({
      id: "x",
      stage: "ready_to_submit",
      applyPacket: {
        url: "https://example.com/posting",
        submitPageUrl: "https://example.com/review/submit",
        ats: "other",
        resumePath: "r.tex",
        accountEmail: "vikasravikarjigi26@gmail.com",
        passwordSecret: "BOARD_PASSWORD",
        answers: {},
        blockedOn: null,
      },
    });
    expect(resolveApplicationUrl(j)).toBe("https://example.com/review/submit");
    expect(applicationLinkMeta(j)?.label).toContain("review");
  });

  it("adds greenhouse apply path", () => {
    expect(enhanceBoardUrl("https://boards.greenhouse.io/acme/jobs/123", "greenhouse", "approved")).toContain("/apply");
  });
});
