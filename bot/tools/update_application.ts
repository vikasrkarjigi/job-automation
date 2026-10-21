import { z } from "zod";
import { defineJsonTool } from "../lib/json.ts";
import { markBlocked, markReady, markSubmitted, saveApplyFlowUrl } from "../../src/orchestrator.ts";
import { jobSummary } from "../lib/format.ts";
import { tagResumes } from "../lib/resume-artifacts.ts";
import { withState } from "../lib/state.ts";

export default defineJsonTool({
  description:
    "Move an application forward. ready: every page is filled and the form waits on the user's Submit click. blocked: the form stopped, with the reason. submitted: ONLY after the user says they pressed Submit themselves; this locks in the exact resume file they sent.",
  inputSchema: z.object({
    id: z.string(),
    status: z.enum(["ready", "blocked", "submitted"]),
    reason: z.string().optional(),
    submitLink: z
      .string()
      .optional()
      .describe("Exact browser URL on the Submit step (job board application review page). Required when status is ready."),
    applyFlowUrl: z
      .string()
      .optional()
      .describe("In-progress application URL while filling the form (saved for the dashboard Open link)."),
  }),
  effect: "write",
  async execute({ id, status, reason, submitLink, applyFlowUrl }, ctx) {
    const job = await withState(ctx.host.files, () => {
      if (applyFlowUrl?.trim()) saveApplyFlowUrl(id, applyFlowUrl, ctx.now());
      if (status === "blocked") return markBlocked(id, reason ?? "blocked", ctx.now());
      if (status === "ready") return markReady(id, submitLink ?? null, ctx.now());
      return markSubmitted(id, ctx.now());
    });
    if (status === "submitted") await tagResumes(ctx, [job]);
    return { ...jobSummary(job), submitLink: submitLink ?? job.applyPacket?.submitPageUrl ?? null };
  },
});
