import { z } from "zod";
import { extractOtp, type MailMessage } from "../../src/apply.ts";
import { defineJsonTool } from "../lib/json.ts";
import { findJob, loadTracker } from "../../src/tracker.ts";

const messageSchema = z.object({
  from: z.string(),
  subject: z.string(),
  body: z.string(),
  receivedAt: z.string(),
});

export default defineJsonTool({
  description:
    "Extract a verification code from Gmail messages for a job application. Pass messages from Gmail MCP (search_threads + get_message) for vikasravikarjigi26@gmail.com. Returns the code or null.",
  inputSchema: z.object({
    jobId: z.string(),
    messages: z.array(messageSchema),
    waitMinutes: z.number().optional().default(5),
  }),
  effect: "read",
  async execute({ jobId, messages, waitMinutes }) {
    const job = findJob(loadTracker(), jobId);
    const since = new Date(Date.now() - waitMinutes * 60_000);
    const code = extractOtp(messages as MailMessage[], job.company, since);
    return {
      jobId,
      company: job.company,
      mailbox: "vikasravikarjigi26@gmail.com",
      code,
      hint: code
        ? "Paste this code into the employer site. Do not commit codes to GitHub."
        : "No code found — broaden Gmail search (company name, verify, code) or wait and retry.",
    };
  },
});
