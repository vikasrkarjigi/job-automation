import { z } from "zod";
import { defineJsonTool } from "../lib/json.ts";
import { saveAnswer } from "../../src/apply.ts";
import { runApproved } from "../../src/orchestrator.ts";
import { withState } from "../lib/state.ts";

export default defineJsonTool({
  description:
    "Save the user's answer to an application question in apply.md so every future form reuses it, then rebuild any apply packet that was blocked on a blank. Pass question only when adding a brand new key. Use the user's exact words; never fill a blank yourself. Never store passwords here.",
  inputSchema: z.object({
    key: z.string().regex(/^[a-z0-9_]+$/),
    answer: z.string().min(1),
    question: z.string().optional(),
  }),
  effect: "write",
  async execute({ key, answer, question }, ctx) {
    if (/password|passcode|\bpin\b/i.test(key + (question ?? ""))) throw new Error("Passwords live in Cursor secrets, never in apply.md.");
    return withState(ctx.host.files, () => {
      const saved = saveAnswer(key, answer, question);
      const unblocked = runApproved({ now: ctx.now() }).jobs.map((j) => ({ id: j.id, stage: j.stage, note: j.note }));
      return { saved, jobs: unblocked };
    });
  },
});
