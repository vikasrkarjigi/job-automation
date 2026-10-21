export const AGENT_DOC_CATALOG = [
  { id: "orchestrator", file: "orchestrator.md", label: "Orchestrator", hint: "Morning run flow and handoffs between agents." },
  { id: "scout", file: "scout.md", label: "Scout", hint: "Job boards, titles, and fetch rules." },
  { id: "ats", file: "ats-score.md", label: "ATS score", hint: "Scoring, gates, and keyword logic." },
  { id: "tailor", file: "resume-tailor.md", label: "Resume tailor", hint: "How resumes are tailored per job." },
  { id: "apply", file: "apply.md", label: "Apply", hint: "Form filling, saved answers, Submit stop." },
  { id: "outreach", file: "outreach.md", label: "Outreach", hint: "Recruiter messages and daily caps." },
  { id: "writing", file: "writing-style.md", label: "Writing style", hint: "Tone rules for open-ended answers." },
] as const;

export type AgentDocId = (typeof AGENT_DOC_CATALOG)[number]["id"];
