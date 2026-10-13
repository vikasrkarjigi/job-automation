import { z } from "zod";
import { defineJsonTool } from "../lib/json.ts";
import { loadBaseResume, loadConfirmations, loadEvidence } from "../../src/profile.ts";
import { allowedTermsFor, bulletsOf, checkBullet } from "../../src/tailor.ts";
import { findJob, loadTracker } from "../../src/tracker.ts";
import { readStored, withState } from "../lib/state.ts";

export default defineJsonTool({
  description:
    "Check a proposed resume bullet for a job against the template rules: 200 to 230 visible characters, no hyphens or dashes, exactly one \\textbf, a first verb not used elsewhere, and no skill without evidence. Run before suggesting any bullet.",
  inputSchema: z.object({ id: z.string(), bullet: z.string() }),
  effect: "read",
  async execute({ id, bullet }, ctx) {
    const job = await withState(ctx.host.files, () => findJob(loadTracker(), id));
    if (!job.analysis || !job.resumePath) return { ok: false, errors: [`${job.company} has not been tailored`] };
    const tex = (await readStored(ctx.host.files, job.resumePath)) ?? "";
    return withState(ctx.host.files, () =>
      checkBullet(bullet, bulletsOf(tex), allowedTermsFor(loadBaseResume(), job.analysis!, loadEvidence(), loadConfirmations())),
    );
  },
});
