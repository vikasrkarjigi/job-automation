import { z } from "zod";
import { defineJsonTool } from "../lib/json.ts";
import { answerQuestion } from "../../src/orchestrator.ts";
import { withState } from "../lib/state.ts";

export default defineJsonTool({
  description:
    "Look up the saved answer for a form question exactly as worded on the page. If no saved answer fits, the job is marked blocked and the question is added to apply.md for the user. Never guess an answer.",
  inputSchema: z.object({ id: z.string(), question: z.string() }),
  effect: "write",
  async execute({ id, question }, ctx) {
    return withState(ctx.host.files, () => answerQuestion(id, question, ctx.now()));
  },
});
