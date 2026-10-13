import { defineSchedule } from "@cursor/bdk/schedules";
import { channelIdFor } from "../lib/roles.ts";
import { dueSlot } from "../lib/schedule.ts";

export default defineSchedule({
  cron: "0 * * * *",
  async run({ receive, waitUntil, appAuth, host }) {
    const slot = dueSlot(new Date());
    if (!slot) return;
    const kvKey = `schedule:ran:${slot.key}`;
    if (await host.kv.get(kvKey)) return;
    await host.kv.put(kvKey, { at: new Date().toISOString() });

    const channel = channelIdFor("scout");
    if (!channel) return;
    const client = await host.slack.getClient();
    const parent = await client.chat.postMessage({
      channel,
      text: `Scheduled ${slot.label} run (${slot.tz}). Fetching AI engineer jobs from the last 24 hours.`,
    });
    if (!parent.ts) return;
    waitUntil(
      receive("slack", {
        message: [
          `Scheduled ${slot.label} scout run. Follow the scout skill end to end.`,
          "When the batch is done, post the shortlist in this thread and call post_update for #tracker with a short digest.",
        ].join(" "),
        auth: appAuth,
        target: { channelId: channel, threadTs: parent.ts },
      }),
    );
  },
});
