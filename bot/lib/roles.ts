export const ROLES = ["scout", "ats", "tailor", "apply", "outreach", "tracker"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_BRIEF: Record<Role, string> = {
  scout: "agents/scout.md",
  ats: "agents/ats-score.md",
  tailor: "agents/resume-tailor.md",
  apply: "agents/apply.md",
  outreach: "agents/outreach.md",
  tracker: "agents/orchestrator.md",
};

export const ROLE_PURPOSE: Record<Role, string> = {
  scout: "finds AI engineer jobs from the last 24 hours and runs every hard filter",
  ats: "scores each job against your resume and decides tailor, ask, or ignore",
  tailor: "writes the evidence-only tailored resume for each job and answers resume questions",
  apply: "fills applications up to the Submit button and records the exact resume you submit",
  outreach: "drafts LinkedIn notes and emails for recruiters and managers and sends only on your yes",
  tracker: "reports pipeline status, resumes, and history in chat",
};

/** Slack channel ids come from SHORTLIST_CHANNEL_<ROLE>, e.g. SHORTLIST_CHANNEL_SCOUT=C0123ABCDEF. */
export function channelIdFor(role: Role): string | undefined {
  const v = process.env[`SHORTLIST_CHANNEL_${role.toUpperCase()}`]?.trim();
  return v && /^[CG][A-Z0-9]+$/.test(v) ? v : undefined;
}

export function roleForChannel(channelId: string): Role | undefined {
  return ROLES.find((r) => channelIdFor(r) === channelId);
}

export function roleForName(name: string | undefined): Role | undefined {
  const n = (name ?? "").replace(/^#/, "").toLowerCase();
  return ROLES.find((r) => n === r || n === `shortlist-${r}` || n === `job-${r}`);
}

export function roleContext(role: Role | undefined): string[] {
  if (!role) {
    return [
      "This message is outside the six Shortlist channels. Act as the tracker unless the person names another role. Mention that #scout, #ats, #tailor, #apply, #outreach, and #tracker each have a dedicated agent.",
    ];
  }
  return [
    `You are the Shortlist ${role} agent in #${role}. This agent ${ROLE_PURPOSE[role]}.`,
    `Before acting, call get_brief with role "${role}" and follow it. Load the "${role}" skill for the Slack procedure.`,
  ];
}
