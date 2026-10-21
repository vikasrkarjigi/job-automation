import type { Launch, RunKind } from "./schedule.ts";

/**
 * Starts and watches Cursor cloud agents through the Cloud Agents API. Each
 * run is a fresh VM on the repository's main branch that follows the agent
 * files and pushes its state back to main, the same way the Slack runs do.
 */

const API = "https://api.cursor.com/v1";

export type RunStatus = "CREATING" | "RUNNING" | "FINISHED" | "ERROR" | "CANCELLED" | "EXPIRED";
export const ACTIVE: RunStatus[] = ["CREATING", "RUNNING"];

export interface RunInfo {
  status: RunStatus;
  durationMs: number | null;
  result: string | null;
}

export const cursorKey = () => process.env.CURSOR_API_KEY?.trim() || null;

const repoUrl = () => `https://github.com/${process.env.SHORTLIST_GITHUB_REPO?.trim() || "vikasrkarjigi/job-automation"}`;
const branch = () => process.env.SHORTLIST_GITHUB_BRANCH?.trim() || "main";

const RULES = `Never press Submit, never send an email or a LinkedIn invite, never search for people on LinkedIn, never
change a score by hand, and never loosen a filter to fill the batch. Do not create a branch or a pull request.`;

const SAVE = `Run npm run export. Commit data/, resumes/, tracker/, profile/, and agents/apply.md, then
git pull --rebase origin main and git push origin main.`;

export const PROMPTS: Record<RunKind, { name: string; text: string }> = {
  fetch: {
    name: "Shortlist: find jobs",
    text: `You are the orchestrator for the Shortlist job pipeline in this repository. Vikas started this run from the dashboard or its schedule.

1. Run npm ci. Read agents/orchestrator.md and agents/scout.md and follow them exactly.
2. Fetch page 1 of every board in agents/scout.md into data/inbox/<today>/. Use the Indeed MCP and the
   Apify LinkedIn actor (APIFY_TOKEN) when available. For a board with no connector, open its search
   page in the browser and save the postings in the same format. Record each new company's industry
   in data/companies.json, from Apollo when available.
3. Run npm run morning. While it prints "needMore": true, fetch exactly the pages in "nextPages" and
   run it again. An empty page means that board is finished, so write [] for it.
4. ${SAVE}
5. If Slack is connected, post the shortlist to #scout as described in automation/morning.md. Vikas also sees
   everything on the dashboard, so a missing Slack connection is not a failure.
6. End with a short plain summary: how many postings were fetched, how many passed the filters, and each
   shortlisted job as title, company, score before and after, and job id.

${RULES}`,
  },
  apply: {
    name: "Shortlist: fill approved applications",
    text: `You are the apply agent for the Shortlist job pipeline in this repository. Vikas started this run from the dashboard.

1. Run npm ci. Read agents/orchestrator.md, agents/apply.md, agents/writing-style.md, and agents/outreach.md.
2. Run npm run approved. For every job it lists, follow agents/apply.md: fill the application up to the
   Submit button, answer questions with npm run answer, write open ended answers with npm run brief and
   npm run write, and record npm run ready or npm run blocked. Then draft outreach per agents/outreach.md.
3. ${SAVE}
4. End with a short plain summary: for each job, the title, company, job id, and whether it is ready to
   submit or blocked and why.

${RULES}`,
  },
};

async function call<T>(method: string, route: string, body?: unknown): Promise<T> {
  const key = cursorKey();
  if (!key) throw new Error("CURSOR_API_KEY is not set in Vercel, so the dashboard cannot start agents yet");
  const res = await fetch(`${API}${route}`, {
    method,
    cache: "no-store",
    headers: {
      authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}`,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cursor ${method} ${route} failed with ${res.status}: ${text.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

export async function startRun(kind: RunKind): Promise<Pick<Launch, "agentId" | "runId" | "url">> {
  const out = await call<{ agent: { id: string; url: string }; run: { id: string } }>("POST", "/agents", {
    name: PROMPTS[kind].name,
    prompt: { text: PROMPTS[kind].text },
    repos: [{ url: repoUrl(), startingRef: branch() }],
    workOnCurrentBranch: true,
    autoCreatePR: false,
  });
  return { agentId: out.agent.id, runId: out.run.id, url: out.agent.url };
}

export async function runInfo(agentId: string, runId: string): Promise<RunInfo> {
  const r = await call<{ status: RunStatus; durationMs?: number; result?: string }>("GET", `/agents/${agentId}/runs/${runId}`);
  return { status: r.status, durationMs: r.durationMs ?? null, result: r.result ?? null };
}

/** Status for each launch that has a run, keyed by run id. Failures leave that run out. */
export async function runInfos(launches: Launch[]): Promise<Map<string, RunInfo>> {
  const out = new Map<string, RunInfo>();
  if (!cursorKey()) return out;
  await Promise.all(
    launches
      .filter((l) => l.agentId && l.runId)
      .map(async (l) => {
        try {
          out.set(l.runId!, await runInfo(l.agentId!, l.runId!));
        } catch {
          /* shown as unknown */
        }
      }),
  );
  return out;
}
