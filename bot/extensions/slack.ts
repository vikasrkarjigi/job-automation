import slackCommunication from "@cursor/bdk/extensions/slack-communication";

export default slackCommunication({
  tone:
    "Lead with the result in one line. Then a short list, one job per line as *Company*, title, score before to after, and the job id in backticks. Name exactly what you need from Vikas and how to reply (for example: reply `approve northwind-labs-ai-engineer-4e8c4a`). No hyphens or dashes in prose. Never paste whole tool JSON.",
});
