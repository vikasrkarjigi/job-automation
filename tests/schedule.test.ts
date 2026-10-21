import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { agentFor, agentSummaries } from "../src/agent-activity.ts";
import { runNow, tick } from "../src/launcher.ts";
import { cleanSchedule, describeSchedule, dueSlot, loadLaunches, saveSchedule, upcoming, type Launch, type Schedule } from "../src/schedule.ts";
import { emptyTracker } from "../src/tracker.ts";
import { tempRoot } from "./helpers.ts";

const pacific = (s: Partial<Schedule> = {}): Schedule => ({
  enabled: true,
  timezone: "America/Los_Angeles",
  times: ["04:00", "12:00", "20:00"],
  days: [0, 1, 2, 3, 4, 5, 6],
  ...s,
});

// 2026-10-20 is a Tuesday. Pacific daylight time is UTC-7.
const pt = (time: string, date = "2026-10-20") => new Date(`${date}T${time}:00-07:00`);

describe("dueSlot", () => {
  it("is due from the slot time for an hour, in the schedule's time zone", () => {
    expect(dueSlot(pacific(), pt("11:59"), [])).toBeNull();
    expect(dueSlot(pacific(), pt("12:00"), [])).toBe("2026-10-20 12:00");
    expect(dueSlot(pacific(), pt("12:37"), [])).toBe("2026-10-20 12:00");
    expect(dueSlot(pacific(), pt("13:01"), [])).toBeNull();
  });

  it("starts each slot once", () => {
    const launched = [{ slot: "2026-10-20 12:00" } as Launch];
    expect(dueSlot(pacific(), pt("12:30"), launched)).toBeNull();
  });

  it("carries a late evening slot past midnight", () => {
    expect(dueSlot(pacific({ times: ["23:45"] }), pt("00:20", "2026-10-21"), [])).toBe("2026-10-20 23:45");
  });

  it("respects days and the off switch", () => {
    expect(dueSlot(pacific({ days: [1, 3, 5] }), pt("12:10"), [])).toBeNull();
    expect(dueSlot(pacific({ enabled: false }), pt("12:10"), [])).toBeNull();
  });
});

describe("schedule helpers", () => {
  it("lists the next runs across days", () => {
    expect(upcoming(pacific(), pt("13:00"), 3)).toEqual(["Tue Oct 20, 8 pm", "Wed Oct 21, 4 am", "Wed Oct 21, 12 pm"]);
    expect(upcoming(pacific({ days: [1] }), pt("13:00"), 1)).toEqual(["Mon Oct 26, 4 am"]);
  });

  it("cleans bad input", () => {
    const s = cleanSchedule({ enabled: true, timezone: "Mars/Base", times: ["20:00", "25:00", "04:00", "04:00", ""], days: [9, 2, 1] });
    expect(s).toEqual({ enabled: true, timezone: "America/Los_Angeles", times: ["04:00", "20:00"], days: [1, 2] });
  });

  it("describes a schedule in plain words", () => {
    expect(describeSchedule(pacific())).toBe("4 am, 12 pm and 8 pm every day");
    expect(describeSchedule(pacific({ times: ["09:30"], days: [1, 2, 3, 4, 5] }))).toBe("9:30 am on weekdays");
    expect(describeSchedule(pacific({ enabled: false }))).toBe("Scheduled runs are off");
  });
});

describe("launcher", () => {
  let calls: { method: string; url: string; body: unknown }[];
  let status: string;

  beforeEach(() => {
    tempRoot();
    delete process.env.SHORTLIST_GITHUB_TOKEN;
    delete process.env.GITHUB_TOKEN;
    process.env.CURSOR_API_KEY = "test-key";
    calls = [];
    status = "RUNNING";
    let n = 0;
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ method: init.method!, url, body: init.body ? JSON.parse(String(init.body)) : null });
      if (init.method === "POST") {
        n++;
        return Response.json({ agent: { id: `bc-${n}`, url: `https://cursor.com/agents/bc-${n}` }, run: { id: `run-${n}` } });
      }
      return Response.json({ status });
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.CURSOR_API_KEY;
  });

  it("starts a scheduled search once per slot and records it", async () => {
    saveSchedule(pacific());
    expect(await tick(pt("12:07"))).toEqual({ started: true, slot: "2026-10-20 12:00", url: "https://cursor.com/agents/bc-1" });
    expect(await tick(pt("12:37"))).toEqual({ started: false, reason: "nothing due" });
    const post = calls.find((c) => c.method === "POST")!;
    expect(post.url).toBe("https://api.cursor.com/v1/agents");
    expect(post.body).toMatchObject({ repos: [{ url: "https://github.com/vikasrkarjigi/job-automation", startingRef: "main" }], workOnCurrentBranch: true, autoCreatePR: false });
    expect(loadLaunches()).toMatchObject([{ kind: "fetch", trigger: "schedule", slot: "2026-10-20 12:00", agentId: "bc-1", runId: "run-1" }]);
  });

  it("skips a slot while the last search is still running, and refuses a second manual run", async () => {
    saveSchedule(pacific());
    await runNow("fetch", pt("11:50"));
    await expect(runNow("fetch", pt("11:55"))).rejects.toThrow(/already running/);
    expect(await tick(pt("12:07"))).toEqual({ started: false, reason: "previous run still going" });
    expect(loadLaunches().at(-1)).toMatchObject({ slot: "2026-10-20 12:00", error: expect.stringMatching(/^Skipped/) });
    expect(await tick(pt("12:37"))).toEqual({ started: false, reason: "nothing due" });
    status = "FINISHED";
    await expect(runNow("fetch", pt("12:40"))).resolves.toMatchObject({ trigger: "you", agentId: expect.any(String) });
  });
});

describe("agent summaries", () => {
  it("attributes history to the agent that did the work", () => {
    expect(agentFor({ at: "", stage: "scoring", note: "passed every hard filter" }, 0)).toBe("scout");
    expect(agentFor({ at: "", stage: "awaiting_approval", note: "tailored" }, 2)).toBe("tailor");
    expect(agentFor({ at: "", stage: "approved", note: "you approved the tailored resume" }, 3)).toBe("tracker");
    expect(agentFor({ at: "", stage: "approved", note: "apply packet ready, blanks filled" }, 4)).toBe("apply");
    expect(agentFor({ at: "", stage: "drafted", note: "5 outreach drafts" }, 5)).toBe("outreach");
    expect(agentFor({ at: "", stage: "drafted", note: 'wrote the answer to "Why us?"' }, 5)).toBe("apply");
  });

  it("returns all six agents for an empty tracker", () => {
    expect(agentSummaries(emptyTracker()).map((a) => a.name)).toEqual(["Scout", "ATS scorer", "Resume tailor", "Apply", "Outreach", "Tracker"]);
  });
});
