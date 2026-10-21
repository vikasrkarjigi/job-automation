import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { extractOtp, type MailMessage } from "./apply.ts";
import { trackerWorkbook } from "./export-xlsx.ts";
import {
  answerQuestion,
  approve,
  confirmKeyword,
  markBlocked,
  markReady,
  saveApplyFlowUrl,
  markSent,
  markSubmitted,
  recordGmailDraft,
  runApproved,
  runMorning,
  saveWritten,
  skip,
} from "./orchestrator.ts";
import { loadBaseResume, loadConfirmations, loadEvidence } from "./profile.ts";
import { readResume } from "./resume-data.ts";
import { renderResumePdf } from "./resume-pdf.ts";
import { parseResume } from "./resume-view.ts";
import { seedDemo } from "./seed.ts";
import { root } from "./settings.ts";
import { allowedTermsFor, bulletsOf, checkBullet } from "./tailor.ts";
import { writingBrief } from "./writer.ts";
import { dayKey, findJob, loadTracker, writeTrackerMarkdown } from "./tracker.ts";

const [cmd, ...args] = process.argv.slice(2);
const print = (v: unknown) => console.log(typeof v === "string" ? v : JSON.stringify(v, null, 2));

function need(n: number, usage: string) {
  if (args.length < n) {
    console.error(`usage: npm run ${cmd} -- ${usage}`);
    process.exit(2);
  }
}

switch (cmd) {
  case "morning":
    print(runMorning());
    break;
  case "approved":
    print(runApproved());
    break;
  case "approve":
    need(1, "<jobId>");
    print({ id: approve(args[0]).id, stage: "approved" });
    break;
  case "skip":
    need(1, "<jobId>");
    print({ id: skip(args[0]).id, stage: "skipped_by_you" });
    break;
  case "confirm": {
    need(2, '"<keyword>" yes|no ["evidence note"]');
    const answer = args[1].toLowerCase();
    if (answer !== "yes" && answer !== "no") throw new Error("answer must be yes or no");
    print(confirmKeyword(args[0], answer, args[2] ?? ""));
    break;
  }
  case "answer": {
    need(2, '<jobId> "<question text>"');
    const r = answerQuestion(args[0], args[1]);
    print(r.ok ? r.answer! : r.write ? `WRITE: ${r.reason}. Run npm run brief -- ${args[0]} "<question>", write it, then npm run write -- ${args[0]} "<question>" "<answer>"` : `BLOCKED: ${r.reason}`);
    break;
  }
  case "otp": {
    need(2, "<jobId> <messages.json>");
    const job = findJob(loadTracker(), args[0]);
    const messages = JSON.parse(fs.readFileSync(args[1], "utf8")) as MailMessage[];
    const since = new Date(Date.now() - 30 * 60_000);
    print(extractOtp(messages, job.company, since) ?? "NO_CODE");
    break;
  }
  case "ready":
    need(1, "<jobId> [submitPageUrl]");
    print({ id: markReady(args[0], args[1]).id, stage: "ready_to_submit", submitPageUrl: args[1] ?? null });
    break;
  case "apply-url":
    need(2, "<jobId> <inProgressUrl>");
    print({ id: saveApplyFlowUrl(args[0], args[1]).id, applyFlowUrl: args[1] });
    break;
  case "otp-gmail":
    need(1, "<jobId> [messages.json]");
    {
      const job = findJob(loadTracker(), args[0]);
      const mailbox = "vikasravikarjigi26@gmail.com";
      if (!args[1]) {
        print({
          mailbox,
          hint: "Search Gmail (MCP search_threads) with a query like:",
          query: `newer_than:1d (verification OR code OR OTP) (${job.company.split(/\s+/)[0]})`,
          then: `npm run otp -- ${args[0]} messages.json`,
        });
        break;
      }
      const messages = JSON.parse(fs.readFileSync(args[1], "utf8")) as MailMessage[];
      const waitMin = 5;
      const since = new Date(Date.now() - waitMin * 60_000);
      print(extractOtp(messages, job.company, since) ?? "NO_CODE");
    }
    break;
  case "blocked":
    need(2, '<jobId> "<reason>"');
    print({ id: markBlocked(args[0], args[1]).id, stage: "apply_blocked" });
    break;
  case "submitted":
    need(1, "<jobId>");
    print({ id: args[0], resume: markSubmitted(args[0]).submittedResumePath });
    break;
  case "sent":
    need(1, "<jobId> [personId ...]");
    print(markSent(args[0], args.slice(1)));
    break;
  case "gmail-draft":
    need(3, "<jobId> <personId> <draftId>");
    recordGmailDraft(args[0], args[1], args[2]);
    print("recorded");
    break;
  case "check-bullet": {
    need(2, '"<bullet>" <jobId>');
    const job = findJob(loadTracker(), args[1]);
    if (!job.analysis || !job.resumePath) throw new Error(`${job.id} has not been tailored`);
    const tex = fs.readFileSync(path.join(root(), job.resumePath), "utf8");
    const allowed = allowedTermsFor(loadBaseResume(), job.analysis, loadEvidence(), loadConfirmations());
    print(checkBullet(args[0], bulletsOf(tex), allowed));
    break;
  }
  case "pdf": {
    need(1, "<jobId> [output.pdf]");
    const { job, tex, base } = readResume(args[0]);
    if (!job || !tex) throw new Error(`${args[0]} has no tailored resume`);
    const out = path.resolve(args[1] ?? path.join(os.tmpdir(), `${job.id}.pdf`));
    fs.writeFileSync(out, await renderResumePdf(parseResume(tex, base), `${job.title} at ${job.company}`));
    print(out);
    break;
  }
  case "xlsx": {
    const out = path.resolve(args[0] ?? path.join(os.tmpdir(), `shortlist-${dayKey()}.xlsx`));
    fs.writeFileSync(out, await trackerWorkbook(loadTracker(), process.env.SHORTLIST_WEB_URL ?? ""));
    print(out);
    break;
  }
  case "brief": {
    need(2, '<jobId> "<question text>"');
    print(writingBrief(findJob(loadTracker(), args[0]), args[1]));
    break;
  }
  case "write": {
    need(3, '<jobId> "<question text>" "<answer>" [wordLimit]');
    const check = saveWritten(args[0], args[1], args[2], "agent", args[3] ? Number(args[3]) : undefined);
    print(check.ok ? `SAVED (${check.words} words)` : `REWRITE: ${check.problems.join("; ")}`);
    if (!check.ok) process.exitCode = 1;
    break;
  }
  case "seed-demo":
    print(seedDemo({ reset: args.includes("--reset") }));
    break;
  case "export":
    writeTrackerMarkdown(loadTracker());
    print("tracker/TRACKER.md written");
    break;
  default:
    console.error(`unknown command: ${cmd ?? "(none)"}`);
    process.exit(2);
}
