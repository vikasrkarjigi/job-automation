import { z } from "zod";
import { defineJsonTool } from "../lib/json.ts";
import { findJob, loadTracker } from "../../src/tracker.ts";
import { jobSummary } from "../lib/format.ts";
import { withState } from "../lib/state.ts";

export default defineJsonTool({
  description:
    "Everything about one job: ATS keywords by tier with matched or missing, renames, gaps, tailor notes, apply packet, people, and the full history. Use the job id from list_jobs or pipeline_status.",
  inputSchema: z.object({ id: z.string() }),
  effect: "read",
  async execute({ id }, ctx) {
    return withState(ctx.host.files, () => {
      const j = findJob(loadTracker(), id);
      const a = j.analysis;
      return {
        ...jobSummary(j),
        ats: a
          ? {
              split: a.split,
              score: a.score,
              ceiling: a.ceiling,
              required: a.keywords.filter((k) => k.tier === "required").map((k) => k.term),
              preferred: a.keywords.filter((k) => k.tier === "preferred").map((k) => k.term),
              matched: a.matched,
              missingWithNoEvidence: a.unmentioned,
              needsConfirm: a.needsConfirm,
              renames: a.renames,
              gaps: a.gaps,
            }
          : null,
        tailorNotes: j.tailorNotes,
        applyPacket: j.applyPacket ? { ...j.applyPacket, answers: Object.keys(j.applyPacket.answers).length } : null,
        people: j.people.map((p) => ({ id: p.id, firstName: p.firstName, role: p.role, source: p.source, invite: p.invite, email: p.emailStatus })),
        history: j.history,
        descriptionPreview: j.description.slice(0, 1200),
      };
    });
  },
});
