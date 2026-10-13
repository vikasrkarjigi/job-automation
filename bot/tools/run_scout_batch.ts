import { z } from "zod";
import { defineJsonTool } from "../lib/json.ts";
import { runMorning } from "../../src/orchestrator.ts";
import { loadTracker } from "../../src/tracker.ts";
import { jobSummary } from "../lib/format.ts";
import { tagResumes } from "../lib/resume-artifacts.ts";
import { withState } from "../lib/state.ts";

export default defineJsonTool({
  description:
    "Run the deterministic pipeline over today's inbox: 24 hour freshness, dedupe, title, 0 to 3 years, sponsorship, agency filters, then ATS gate and evidence-only tailoring. Stops at the batch size. When needMore is true, fetch exactly the pages in nextPages, ingest them, and run this again.",
  inputSchema: z.object({}),
  effect: "write",
  async execute(_input, ctx) {
    const { summary, jobs } = await withState(ctx.host.files, () => {
      const summary = runMorning({ now: ctx.now() });
      const ids = new Set(summary.shortlist.map((s) => s.id));
      return { summary, jobs: loadTracker().jobs.filter((j) => ids.has(j.id)) };
    });
    await tagResumes(ctx, jobs);
    return {
      ...summary,
      shortlist: jobs.map(jobSummary),
      nextStep:
        summary.status === "locked"
          ? "Another run holds the lock. Report that and stop."
          : summary.needMore
            ? `Only ${summary.passedToday} of ${summary.batchSize} passed. Fetch ${summary.nextPages.map((p) => `${p.board} page ${p.page}`).join(", ")}, ingest, and run again.`
            : "Batch complete. Post the shortlist and keyword questions.",
    };
  },
});
