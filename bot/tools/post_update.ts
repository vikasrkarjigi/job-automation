import { z } from "zod";
import { defineJsonTool } from "../lib/json.ts";
import { channelIdFor, ROLES } from "../lib/roles.ts";

export default defineJsonTool({
  description:
    "Post a new top-level message in another Shortlist channel, for example a digest in #tracker after a run, or a heads-up in #apply that a form is ready for Submit. Slack mrkdwn. Keep it short.",
  inputSchema: z.object({ role: z.enum(ROLES), text: z.string().min(1).max(3500) }),
  effect: "write",
  async execute({ role, text }, ctx) {
    const channel = channelIdFor(role);
    if (!channel) return { posted: false, why: `SHORTLIST_CHANNEL_${role.toUpperCase()} is not set.` };
    const client = await ctx.host.slack.getClient();
    const res = await client.chat.postMessage({ channel, text });
    return { posted: !!res.ok, channel: `#${role}`, ts: res.ts ?? null };
  },
});
