import { z } from "zod";
import { defineJsonTool } from "../lib/json.ts";
import { loadAnswers } from "../../src/apply.ts";
import { findJob, loadTracker } from "../../src/tracker.ts";
import { jobSummary } from "../lib/format.ts";
import { readStored, withState } from "../lib/state.ts";

export default defineJsonTool({
  description:
    "The apply packet for an approved job: application URL, ATS type, account email, which secret holds the password, every saved answer, blanks blocking it, and the resume file to upload. Use it to brief the cloud agent that fills the form.",
  inputSchema: z.object({ id: z.string() }),
  effect: "read",
  async execute({ id }, ctx) {
    const { job, answers } = await withState(ctx.host.files, () => ({
      job: findJob(loadTracker(), id),
      answers: Object.fromEntries([...loadAnswers()].map(([k, a]) => [k, { question: a.question, answer: a.answer }])),
    }));
    if (!job.applyPacket) return { job: jobSummary(job), packet: null, why: `No packet yet; the job is ${job.stage}. Approve it first.` };
    const rel = job.applyPacket.resumePath;
    return {
      job: jobSummary(job),
      packet: job.applyPacket,
      savedAnswers: answers,
      blanks: Object.entries(answers).filter(([, a]) => !a.answer).map(([k, a]) => `${k}: ${a.question}`),
      resumeFile: rel,
      resumeTex: (await readStored(ctx.host.files, rel)) ?? null,
    };
  },
});
