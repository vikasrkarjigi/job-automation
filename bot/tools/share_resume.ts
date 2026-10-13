import { z } from "zod";
import { defineJsonTool } from "../lib/json.ts";
import { parseResume, resumeAsText } from "../../src/resume-view.ts";
import { findJob, loadTracker } from "../../src/tracker.ts";
import { webUrl } from "../lib/format.ts";
import { readStored, withState } from "../lib/state.ts";

function slackThread(key: string | null | undefined) {
  const m = key?.match(/^([CGD][A-Z0-9]+)(?::(\d+\.\d+))?$/);
  return m ? { channelId: m[1], threadTs: m[2] } : null;
}

export default defineJsonTool({
  description:
    "Upload a job's stored resume into this Slack thread as two files: the .tex source and a readable .txt with tailor changes marked. Use when the user asks to see, download, or attach the resume.",
  inputSchema: z.object({ id: z.string() }),
  effect: "write",
  async execute({ id }, ctx) {
    const job = await withState(ctx.host.files, () => findJob(loadTracker(), id));
    const rel = job.submittedResumePath ?? job.resumePath;
    if (!rel) return { shared: false, why: `No tailored resume for ${job.company}; stage is ${job.stage}.` };
    const tex = await readStored(ctx.host.files, rel);
    if (!tex) return { shared: false, why: `${rel} is missing from storage.` };
    const thread = slackThread(ctx.session.continuationKey);
    if (!thread) return { shared: false, why: "This conversation is not a Slack thread.", tex };
    const text = resumeAsText(parseResume(tex, (await readStored(ctx.host.files, "profile/base.tex")) ?? null));
    const client = await ctx.host.slack.getClient();
    await client.files.uploadV2({
      channel_id: thread.channelId,
      ...(thread.threadTs ? { thread_ts: thread.threadTs } : {}),
      initial_comment: `${job.submittedResumePath ? "Exact resume submitted" : "Tailored resume"} for ${job.title} at ${job.company}${webUrl(`/resume/${id}`) ? `. Formatted view: ${webUrl(`/resume/${id}`)}` : ""}`,
      file_uploads: [
        { filename: `${id}.tex`, content: tex },
        { filename: `${id}.txt`, content: text },
      ],
    });
    return { shared: true, files: [`${id}.tex`, `${id}.txt`] };
  },
});
