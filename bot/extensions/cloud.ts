import cursorCloudAgents from "@cursor/bdk/extensions/cursor-cloud-agents";

const repo = process.env.SHORTLIST_REPO_URL?.trim();

export default cursorCloudAgents({
  cloud: {
    ...(repo ? { repos: [{ url: repo, startingRef: "main" }] } : {}),
    autoCreatePR: false,
  },
  needsApproval: false,
  watchStops: true,
});
