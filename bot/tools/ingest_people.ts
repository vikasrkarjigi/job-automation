import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { defineJsonTool } from "../lib/json.ts";
import { runApproved } from "../../src/orchestrator.ts";
import { paths } from "../../src/settings.ts";
import { findJob, loadTracker } from "../../src/tracker.ts";
import { withState } from "../lib/state.ts";

const PersonInput = z.object({
  firstName: z.string(),
  lastName: z.string().default(""),
  role: z.string(),
  company: z.string(),
  source: z.string().describe("apollo or vibe. Anything else is rejected."),
  linkedinUrl: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
});

export default defineJsonTool({
  description:
    "Save the recruiters, hiring managers, and engineers found in Apollo or Vibe for an approved job, then draft a LinkedIn note and email for each. People scraped from a LinkedIn search are refused. Drafts follow the outreach hard rules and wait for the user's yes.",
  inputSchema: z.object({ id: z.string(), people: z.array(PersonInput).min(1) }),
  effect: "write",
  async execute({ id, people }, ctx) {
    return withState(ctx.host.files, () => {
      fs.mkdirSync(paths.people(), { recursive: true });
      fs.writeFileSync(path.join(paths.people(), `${id}.json`), JSON.stringify(people, null, 2));
      const job = findJob(loadTracker(), id);
      if (!["approved", "apply_blocked", "ready_to_submit"].includes(job.stage)) {
        return { saved: people.length, drafted: 0, note: `Saved. Drafts are written once ${job.company} is approved (it is ${job.stage}).` };
      }
      const result = runApproved({ now: ctx.now() }).jobs.find((j) => j.id === id);
      return { saved: people.length, drafted: findJob(loadTracker(), id).people.length, note: result?.note ?? "" };
    });
  },
});
