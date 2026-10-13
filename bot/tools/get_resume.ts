import { z } from "zod";
import { defineJsonTool } from "../lib/json.ts";
import { parseResume, resumeAsText } from "../../src/resume-view.ts";
import { findJob, loadTracker } from "../../src/tracker.ts";
import { jobSummary } from "../lib/format.ts";
import { readStored, withState } from "../lib/state.ts";

export default defineJsonTool({
  description:
    "Read the tailored resume stored for a job as readable text with every tailor change marked, plus the change summary and renames. Use format tex for the raw LaTeX. Submitted jobs return the exact file that was submitted.",
  inputSchema: z.object({ id: z.string(), format: z.enum(["text", "tex"]).default("text") }),
  effect: "read",
  async execute({ id, format }, ctx) {
    const job = await withState(ctx.host.files, () => findJob(loadTracker(), id));
    const rel = job.submittedResumePath ?? job.resumePath;
    if (!rel) return { job: jobSummary(job), resume: null, why: `No tailored resume. Stage is ${job.stage}${job.reason ? `: ${job.reason}` : ""}.` };
    const tex = await readStored(ctx.host.files, rel);
    if (!tex) return { job: jobSummary(job), resume: null, why: `${rel} is missing from storage.` };
    const base = (await readStored(ctx.host.files, "profile/base.tex")) ?? null;
    const doc = parseResume(tex, base);
    return {
      job: jobSummary(job),
      file: rel,
      exactSubmittedFile: !!job.submittedResumePath,
      changes: doc.changes,
      renames: job.analysis?.renames ?? [],
      tailorNotes: job.tailorNotes,
      resume: format === "tex" ? tex : resumeAsText(doc),
    };
  },
});
