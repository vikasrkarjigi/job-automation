import { defaultSlackAuth, slackChannel } from "@cursor/bdk/channels/slack";
import type { SlackBinding, SlackMessage } from "@cursor/bdk/channels/slack";
import { channelIdFor, roleContext, roleForChannel, roleForName, ROLES, type Role } from "../lib/roles.ts";

const watched = [...new Set(ROLES.map(channelIdFor).filter((id): id is string => !!id))];

const LOADING: Record<Role | "none", string[]> = {
  scout: ["Checking today's postings...", "Running the hard filters..."],
  ats: ["Scoring against your resume...", "Checking required keywords..."],
  tailor: ["Reading the tailored resume...", "Checking bullets against the template rules..."],
  apply: ["Checking the apply packet...", "Looking at saved answers..."],
  outreach: ["Reading the outreach drafts...", "Checking the daily invite cap..."],
  tracker: ["Reading the tracker...", "Counting applications..."],
  none: ["Reading the tracker..."],
};

async function resolveRole(ctx: SlackBinding, channelId: string): Promise<Role | undefined> {
  const byEnv = roleForChannel(channelId);
  if (byEnv) return byEnv;
  const key = `slack:channel-name:${channelId}`;
  const cached = (await ctx.host.kv.get(key)) as { name?: string } | undefined;
  if (cached?.name !== undefined) return roleForName(cached.name);
  try {
    const client = await ctx.host.slack.getClient();
    const info = await client.conversations.info({ channel: channelId });
    const name = info.channel?.name ?? "";
    await ctx.host.kv.put(key, { name });
    return roleForName(name);
  } catch {
    return undefined;
  }
}

function fromOwner(message: SlackMessage): boolean {
  const owner = process.env.SHORTLIST_OWNER_SLACK_ID?.trim();
  return !owner || message.author?.userId === owner;
}

function handler(engagement?: string) {
  return async (ctx: SlackBinding, message: SlackMessage) => {
    if (message.author?.isBot || !fromOwner(message)) return null;
    if (!message.markdown.trim() && !message.files?.length) return null;
    const auth = defaultSlackAuth(message, ctx, { respondTo: "thread", ...(engagement ? { engagement } : {}) });
    if (!auth) return null;
    const role = await resolveRole(ctx, message.channelId);
    await ctx.thread.startTyping("Working on it...", LOADING[role ?? "none"]);
    return { auth, context: roleContext(role) };
  };
}

export default slackChannel({
  envPrefix: "SHORTLIST",
  reply: { mode: "agentic" },
  ...(watched.length ? { engagement: { channelPosts: { allow: watched, posts: "top-level" as const } } } : {}),
  onAppMention: handler(),
  onDirectMessage: handler(),
  onChannelPost: handler("channel_post"),
});
