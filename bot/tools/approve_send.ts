import { z } from "zod";
import { defineJsonTool } from "../lib/json.ts";
import { markSent } from "../../src/orchestrator.ts";
import { findJob, loadTracker } from "../../src/tracker.ts";
import { withState } from "../lib/state.ts";

export default defineJsonTool({
  description:
    "Record the user's explicit yes to send outreach for a job, applying the daily LinkedIn invite cap. Returns exactly which invites and emails may go out now and which are held for tomorrow. Call ONLY after the user said yes to these drafts in this conversation, then hand the sending to a cloud agent.",
  inputSchema: z.object({
    id: z.string(),
    personIds: z.array(z.string()).default([]).describe("Empty means every drafted person on the job."),
    userSaidYes: z.literal(true),
  }),
  effect: "write",
  async execute({ id, personIds }, ctx) {
    return withState(ctx.host.files, () => {
      const r = markSent(id, personIds, ctx.now());
      const job = findJob(loadTracker(), id);
      const pick = (ids: string[]) => job.people.filter((p) => ids.includes(p.id));
      return {
        sendInvitesNow: pick(r.sent).map((p) => ({ id: p.id, firstName: p.firstName, linkedinUrl: p.linkedinUrl, note: p.note })),
        sendEmailsNow: pick(r.emails).map((p) => ({ id: p.id, firstName: p.firstName, email: p.email, gmailDraftId: p.gmailDraftId, subject: p.emailSubject, body: p.emailBody })),
        heldByDailyCap: pick(r.heldByCap).map((p) => ({ id: p.id, firstName: p.firstName })),
      };
    });
  },
});
