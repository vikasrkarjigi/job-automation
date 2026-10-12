import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { answerFor, extractOtp, loadAnswers, parseAnswers } from "../src/apply";
import { answerQuestion, approve, markSent, runApproved, runMorning } from "../src/orchestrator";
import { checkMessage, draftNote, NOTE_LIMIT, pickPeople } from "../src/outreach";
import { dayKey, loadTracker } from "../src/tracker";
import type { JobRow } from "../src/types";
import { posting, tempRoot, writeInbox } from "./helpers";

function fillAnswers(root: string, values: Record<string, string>) {
  const file = path.join(root, "agents", "apply.md");
  let md = fs.readFileSync(file, "utf8");
  for (const [k, v] of Object.entries(values)) md = md.replace(new RegExp(`^(- ${k} \\(.+\\):).*$`, "m"), `$1 ${v}`);
  fs.writeFileSync(file, md);
}

describe("apply answers", () => {
  let root: string;
  beforeEach(() => {
    root = tempRoot();
  });

  it("never guesses a blank answer", () => {
    const r = answerFor("Will you now or in the future require visa sponsorship?", loadAnswers());
    expect(r.ok).toBe(false);
  });

  it("maps saved answers onto form wording", () => {
    fillAnswers(root, { sponsorship_now: "No", sponsorship_future: "Yes", salary: "120000", relocate: "Yes" });
    const a = loadAnswers();
    expect(answerFor("Will you now or in the future require visa sponsorship?", a)).toMatchObject({ ok: true, answer: "Yes" });
    expect(answerFor("Will you now require sponsorship?", a)).toMatchObject({ ok: true, answer: "No" });
    expect(answerFor("What are your salary expectations?", a)).toMatchObject({ ok: true, answer: "120000" });
    expect(answerFor("Are you open to relocation?", a)).toMatchObject({ ok: true, answer: "Yes" });
    expect(answerFor("Gender", a)).toMatchObject({ ok: true, answer: "Decline to answer" });
  });

  it("adds a new question to apply.md once and blocks that job", () => {
    const now = new Date();
    writeInbox(root, dayKey(now), "indeed", 1, [posting()]);
    runMorning({ now });
    const job = loadTracker().jobs[0];
    approve(job.id);
    const q = "Do you have a published paper on retrieval?";
    expect(answerQuestion(job.id, q).ok).toBe(false);
    answerQuestion(job.id, q);
    const md = fs.readFileSync(path.join(root, "agents", "apply.md"), "utf8");
    expect(md.split(q).length - 1).toBe(1);
    expect(loadTracker().jobs[0].stage).toBe("apply_blocked");
    expect(parseAnswers(md).some((a) => a.question === q && a.answer === "")).toBe(true);
  });

  it("reads the newest one time code from that company", () => {
    const since = new Date("2026-10-12T10:00:00Z");
    const code = extractOtp(
      [
        { from: "no-reply@acme.com", subject: "Your Acme code", body: "Your verification code is 111111", receivedAt: "2026-10-12T09:00:00Z" },
        { from: "jobs@other.com", subject: "Code", body: "Your code is 222222", receivedAt: "2026-10-12T10:05:00Z" },
        { from: "no-reply@acme.com", subject: "Acme sign in", body: "Use passcode 483920 to continue.", receivedAt: "2026-10-12T10:03:00Z" },
      ],
      "Acme",
      since,
    );
    expect(code).toBe("483920");
  });
});

describe("outreach rules", () => {
  beforeEach(() => {
    tempRoot();
  });

  const job = { title: "AI Engineer", company: "Acme" } as JobRow;
  const person = { firstName: "Priya", lastName: "Raman" };

  it("rejects hyphens, last names, a missing company or role, and 300 characters or more", () => {
    expect(checkMessage("Hi Priya, I applied for the AI Engineer role at Acme.", person, job.title, job.company, NOTE_LIMIT).ok).toBe(true);
    expect(checkMessage("Hi Priya, I applied for the AI Engineer role at Acme - thanks.", person, job.title, job.company).errors).toContain("contains a hyphen or dash");
    expect(checkMessage("Hi Priya Raman, I applied for the AI Engineer role at Acme.", person, job.title, job.company).errors).toContain("uses the last name");
    expect(checkMessage("Hi Priya, I applied for the AI Engineer role.", person, job.title, job.company).errors).toContain("does not name the company");
    expect(checkMessage("Hi Priya, I applied at Acme.", person, job.title, job.company).errors).toContain("does not name the role");
    const long = `Hi Priya, I applied for the AI Engineer role at Acme. ${"x".repeat(260)}`;
    expect(checkMessage(long, person, job.title, job.company, NOTE_LIMIT).errors.join()).toMatch(/under 300/);
  });

  it("drafts notes that pass the rules for a title with a dash", () => {
    const j = { title: "AI Engineer - LLM Platform", company: "Acme" } as JobRow;
    const note = draftNote({ ...person, role: "Recruiter", company: "Acme", source: "apollo" }, j, ["Python", "RAG", "LangChain"]);
    expect(checkMessage(note, person, j.title, j.company, NOTE_LIMIT)).toEqual({ ok: true, errors: [] });
  });

  it("keeps Apollo and Vibe people only, recruiters first, five at most", () => {
    const list = [
      { firstName: "A", lastName: "1", role: "Software Engineer", company: "Acme", source: "apollo" },
      { firstName: "B", lastName: "2", role: "Recruiter", company: "Acme", source: "linkedin_search" },
      { firstName: "C", lastName: "3", role: "Technical Recruiter", company: "Acme", source: "vibe" },
      { firstName: "D", lastName: "4", role: "Engineering Manager", company: "Acme", source: "apollo" },
      { firstName: "E", lastName: "5", role: "ML Engineer", company: "Acme", source: "apollo" },
      { firstName: "F", lastName: "6", role: "Engineer", company: "Acme", source: "apollo" },
      { firstName: "G", lastName: "7", role: "Engineer", company: "Acme", source: "apollo" },
    ];
    expect(pickPeople(list, 5).map((p) => p.firstName)).toEqual(["C", "D", "A", "E", "F"]);
  });
});

describe("approved run and the daily invite cap", () => {
  let root: string;
  beforeEach(() => {
    root = tempRoot();
  });

  it("drafts outreach, sends only after the yes, and holds invites past the cap", () => {
    fs.writeFileSync(path.join(root, "profile", "settings.json"), JSON.stringify({ inviteCapPerDay: 2 }));
    const now = new Date();
    writeInbox(root, dayKey(now), "indeed", 1, [posting()]);
    runMorning({ now });
    const job = loadTracker().jobs[0];
    fs.mkdirSync(path.join(root, "data", "people"), { recursive: true });
    fs.writeFileSync(
      path.join(root, "data", "people", `${job.id}.json`),
      JSON.stringify(
        ["Ana", "Ben", "Cy"].map((n, i) => ({ firstName: n, lastName: `Last${i}`, role: "Recruiter", company: "Acme", source: "apollo", linkedinUrl: `https://linkedin.com/in/${n}`, email: `${n}@acme.example` })),
      ),
    );
    approve(job.id);
    const r = runApproved({ now });
    expect(r.jobs[0]).toMatchObject({ packet: true, people: 3, stage: "apply_blocked" });
    expect(loadTracker().jobs[0].people.every((p) => p.invite === "draft" && p.emailStatus === "draft")).toBe(true);

    const sent = markSent(job.id, [], now);
    expect(sent.sent).toHaveLength(2);
    expect(sent.heldByCap).toHaveLength(1);
    expect(sent.emails).toHaveLength(3);
  });
});
