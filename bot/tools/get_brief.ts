import { z } from "zod";
import { defineJsonTool } from "../lib/json.ts";
import { ROLE_BRIEF, ROLES } from "../lib/roles.ts";
import { readStored } from "../lib/state.ts";

export default defineJsonTool({
  description:
    "Read the instruction file for one Shortlist agent role (scout, ats, tailor, apply, outreach, tracker). Call this before acting in a role channel. The apply brief holds the saved application answers.",
  inputSchema: z.object({ role: z.enum(ROLES) }),
  effect: "read",
  async execute({ role }, ctx) {
    const brief = await readStored(ctx.host.files, ROLE_BRIEF[role]);
    return { role, file: ROLE_BRIEF[role], brief: brief ?? "missing" };
  },
});
