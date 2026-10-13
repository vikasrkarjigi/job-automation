import { z } from "zod";
import { defineJsonTool } from "../lib/json.ts";
import { recordGmailDraft } from "../../src/orchestrator.ts";
import { withState } from "../lib/state.ts";

export default defineJsonTool({
  description: "Record the Gmail draft id created for one person's outreach email so the tracker links to it.",
  inputSchema: z.object({ id: z.string(), personId: z.string(), draftId: z.string() }),
  effect: "write",
  async execute({ id, personId, draftId }, ctx) {
    return withState(ctx.host.files, () => {
      recordGmailDraft(id, personId, draftId);
      return { recorded: true };
    });
  },
});
