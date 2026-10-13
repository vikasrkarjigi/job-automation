import { z } from "zod";
import { defineJsonTool } from "../lib/json.ts";
import { loadSettings } from "../../src/settings.ts";
import { loadTracker } from "../../src/tracker.ts";
import { statusOf } from "../lib/format.ts";
import { withState } from "../lib/state.ts";

export default defineJsonTool({
  description:
    "Tracker snapshot: counts, everything waiting on the user (keyword questions, approvals, blocked applications, Submit clicks, outreach to send), jobs being filled, and the last run. Use for any status or digest question.",
  inputSchema: z.object({}),
  effect: "read",
  async execute(_input, ctx) {
    return withState(ctx.host.files, () => ({ ...statusOf(loadTracker(), ctx.now()), settings: loadSettings() }));
  },
});
