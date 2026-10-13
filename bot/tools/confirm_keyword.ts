import { z } from "zod";
import { defineJsonTool } from "../lib/json.ts";
import { confirmKeyword } from "../../src/orchestrator.ts";
import { loadTracker } from "../../src/tracker.ts";
import { jobSummary } from "../lib/format.ts";
import { tagResumes } from "../lib/resume-artifacts.ts";
import { withState } from "../lib/state.ts";

export default defineJsonTool({
  description:
    "Record the user's answer to a keyword question (do you have real experience with X). The answer is remembered for every future job, and every job waiting on a question is re-scored. Only call with the user's own answer, never a guess.",
  inputSchema: z.object({
    term: z.string(),
    answer: z.enum(["yes", "no"]),
    note: z.string().default("").describe("Where the user used it, in their words. Becomes evidence for bullets."),
  }),
  effect: "write",
  async execute({ term, answer, note }, ctx) {
    const { run, jobs } = await withState(ctx.host.files, () => {
      const run = confirmKeyword(term, answer, note, ctx.now());
      return { run, jobs: loadTracker().jobs.filter((j) => j.stage === "needs_confirm" || j.stage === "awaiting_approval") };
    });
    await tagResumes(ctx, jobs.filter((j) => j.stage === "awaiting_approval"));
    return { remembered: { term, answer }, run, jobs: jobs.map(jobSummary) };
  },
});
