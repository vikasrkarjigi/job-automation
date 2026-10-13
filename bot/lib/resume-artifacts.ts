import type { ToolContext } from "@cursor/bdk";
import type { JobRow } from "../../src/types.ts";
import { readStored } from "./state.ts";

/** Every tailored resume is also kept as an artifact, so it can be listed and downloaded from the deployment. */
export async function tagResumes(ctx: ToolContext, jobs: JobRow[]): Promise<number> {
  let tagged = 0;
  for (const j of jobs) {
    const rel = j.submittedResumePath ?? j.resumePath;
    if (!rel) continue;
    const tex = await readStored(ctx.host.files, rel);
    if (!tex) continue;
    const submitted = !!j.submittedResumePath;
    await ctx.artifacts.tag({
      kind: "tailored-resume",
      key: `resume:${j.id}`,
      title: `${submitted ? "Submitted: " : ""}${j.title} at ${j.company}`,
      data: { jobId: j.id, company: j.company, title: j.title, score: `${j.scoreBefore ?? "?"} to ${j.scoreAfter ?? "?"}`, submitted },
      contents: tex,
      contentType: "application/x-tex",
    });
    tagged++;
  }
  return tagged;
}
