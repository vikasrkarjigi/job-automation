import { z } from "zod";
import { defineJsonTool } from "../lib/json.ts";
import { loadSettings } from "../../src/settings.ts";
import { dayKey, findJob, loadTracker } from "../../src/tracker.ts";
import { withState } from "../lib/state.ts";

export default defineJsonTool({
  description:
    "Show the outreach drafts for a job: each person's first name, role, source, LinkedIn note (under 300 characters), email subject and body, and what has been sent. Also returns how many LinkedIn invites are left today.",
  inputSchema: z.object({ id: z.string() }),
  effect: "read",
  async execute({ id }, ctx) {
    return withState(ctx.host.files, () => {
      const data = loadTracker();
      const job = findJob(data, id);
      const used = data.invitesSentByDay[dayKey(ctx.now())] ?? 0;
      return {
        job: { id, company: job.company, title: job.title, stage: job.stage },
        invitesLeftToday: Math.max(0, loadSettings().inviteCapPerDay - used),
        people: job.people.map((p) => ({
          id: p.id,
          firstName: p.firstName,
          role: p.role,
          source: p.source,
          linkedinUrl: p.linkedinUrl,
          email: p.email,
          note: p.note,
          noteLength: p.note.length,
          emailSubject: p.emailSubject,
          emailBody: p.emailBody,
          invite: p.invite,
          emailStatus: p.emailStatus,
          gmailDraftId: p.gmailDraftId,
        })),
      };
    });
  },
});
