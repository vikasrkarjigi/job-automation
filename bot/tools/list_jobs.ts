import { z } from "zod";
import { defineJsonTool } from "../lib/json.ts";
import { loadTracker } from "../../src/tracker.ts";
import { jobSummary } from "../lib/format.ts";
import { withState } from "../lib/state.ts";

const STAGES = ["ignored", "scoring", "needs_confirm", "awaiting_approval", "skipped_by_you", "approved", "apply_blocked", "ready_to_submit", "submitted"] as const;

export default defineJsonTool({
  description: "List tracked jobs, newest first. Filter by stage, by company or title text, or by day (YYYY-MM-DD the job was found).",
  inputSchema: z.object({
    stage: z.enum(STAGES).optional(),
    query: z.string().optional(),
    day: z.string().optional(),
    limit: z.number().int().min(1).max(100).default(25),
  }),
  effect: "read",
  async execute({ stage, query, day, limit }, ctx) {
    return withState(ctx.host.files, () => {
      const q = query?.toLowerCase();
      const jobs = loadTracker()
        .jobs.filter((j) => !stage || j.stage === stage)
        .filter((j) => !day || j.createdAt.startsWith(day))
        .filter((j) => !q || `${j.company} ${j.title}`.toLowerCase().includes(q))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return { total: jobs.length, jobs: jobs.slice(0, limit).map(jobSummary) };
    });
  },
});
