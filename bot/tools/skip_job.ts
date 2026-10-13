import { z } from "zod";
import { defineJsonTool } from "../lib/json.ts";
import { skip } from "../../src/orchestrator.ts";
import { jobSummary } from "../lib/format.ts";
import { withState } from "../lib/state.ts";

export default defineJsonTool({
  description: "The user does not want to apply to a shortlisted job. Marks it skipped. Only on the user's word.",
  inputSchema: z.object({ id: z.string() }),
  effect: "write",
  async execute({ id }, ctx) {
    return withState(ctx.host.files, () => jobSummary(skip(id, ctx.now())));
  },
});
