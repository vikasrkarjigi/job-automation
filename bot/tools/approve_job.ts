import { z } from "zod";
import { defineJsonTool } from "../lib/json.ts";
import { approve, runApproved } from "../../src/orchestrator.ts";
import { findJob, loadTracker } from "../../src/tracker.ts";
import { jobSummary } from "../lib/format.ts";
import { withState } from "../lib/state.ts";

export default defineJsonTool({
  description:
    "The user approved the tailored resume for a job. Moves it to apply, builds the apply packet from saved answers, and drafts outreach when people are already loaded. Only call when the user said approve, yes, or go for that job.",
  inputSchema: z.object({ id: z.string() }),
  effect: "write",
  async execute({ id }, ctx) {
    return withState(ctx.host.files, () => {
      approve(id, ctx.now());
      const result = runApproved({ now: ctx.now() }).jobs.find((j) => j.id === id);
      const job = findJob(loadTracker(), id);
      return { job: jobSummary(job), applyBlockedOn: job.applyPacket?.blockedOn ?? null, note: result?.note ?? "" };
    });
  },
});
