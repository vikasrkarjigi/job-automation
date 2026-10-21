import fs from "node:fs";
import { connection } from "next/server";
import Link from "next/link";
import { Suspense } from "react";
import { loadAgentConfig } from "@/agent-config";
import { agentSummaries } from "@/agent-activity";
import { answerSections, NOT_BLANK } from "@/apply";
import { cursorKey, runInfos } from "@/cloud";
import { Agents, KIND_LABEL, at } from "@/components/tracker/agents";
import { Answers } from "@/components/tracker/answers";
import { AutoRefresh } from "@/components/tracker/client";
import { DashboardLayout, type DeskTab } from "@/components/tracker/dashboard-layout";
import { EmptyState, PageHeader } from "@/components/tracker/design";
import { ScheduleForm } from "@/components/tracker/schedule";
import { Applications, Ignored, Outreach, Resumes, Runs } from "@/components/tracker/tables";
import { Today } from "@/components/tracker/today";
import { loadSettings, paths } from "@/settings";
import { describeSchedule, loadLaunches, loadSchedule, upcoming } from "@/schedule";
import { readState } from "@/store";
import { counts, loadTracker } from "@/tracker";

const TABS: DeskTab[] = ["today", "applications", "outreach", "resumes", "ignored", "answers", "agents", "schedule", "runs"];

const TAB_COPY: Record<DeskTab, { title: string; description: string }> = {
  today: { title: "Overview", description: "Jobs from the last 24 hours that need your decision, a keyword answer, or a final Submit click." },
  applications: { title: "Applications", description: "Every job that passed your filters, with stage, score, and resume links." },
  outreach: { title: "Outreach", description: "Draft notes to recruiters and hiring managers. Nothing sends until you approve." },
  resumes: { title: "Resumes", description: "Tailored resumes written for each shortlisted role." },
  ignored: { title: "Ignored", description: "Jobs that failed a hard filter or were skipped, with the reason." },
  answers: { title: "My answers", description: "Saved answers the apply agent uses on every form. Blanks always stop the run." },
  agents: { title: "Agents & models", description: "Pipeline agents, cloud run history, and which Cursor models to use." },
  schedule: { title: "Schedule", description: "When automatic job searches should run." },
  runs: { title: "Run log", description: "What each pipeline run fetched, kept, and dropped." },
};

export default function Page({ searchParams }: PageProps<"/">) {
  return (
    <Suspense fallback={<DeskSkeleton />}>
      <Desk searchParams={searchParams} />
    </Suspense>
  );
}

function Notice({ done, error, started }: { done?: string; error?: string; started?: string }) {
  if (error) {
    return (
      <div role="alert" className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        {error}
      </div>
    );
  }
  if (started) {
    return (
      <div role="status" className="mb-6 rounded-lg border border-emerald-600/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-900 dark:text-emerald-100">
        {started}.
      </div>
    );
  }
  if (done) {
    return (
      <div role="status" className="mb-6 rounded-lg border border-emerald-600/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-900 dark:text-emerald-100">
        {done}. Saved.
      </div>
    );
  }
  return null;
}

async function Desk({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  await connection();
  const sp = await searchParams;
  const tab: DeskTab = TABS.includes(sp.tab as DeskTab) ? (sp.tab as DeskTab) : "today";
  const back = tab === "today" ? "/" : `/?tab=${tab}`;
  const copy = TAB_COPY[tab];

  let state;
  try {
    state = await readState(() => ({
      data: loadTracker(),
      settings: loadSettings(),
      sections: fs.existsSync(paths.applyMd()) ? answerSections(fs.readFileSync(paths.applyMd(), "utf8")) : [],
      schedule: loadSchedule(),
      launches: loadLaunches(),
      agentConfig: loadAgentConfig(),
    }));
  } catch (err) {
    return (
      <div className="flex min-h-svh items-center justify-center p-8">
        <div role="alert" className="max-w-lg rounded-lg border border-destructive/30 bg-card p-6 text-sm shadow-sm">
          <p className="font-medium text-destructive">Could not read your pipeline from GitHub.</p>
          <p className="mt-1 text-muted-foreground">{err instanceof Error ? err.message : String(err)}</p>
        </div>
      </div>
    );
  }

  const { data, settings, sections, schedule, launches, agentConfig } = state;
  const now = new Date();
  const watched = launches.filter((l, i) => (tab === "agents" && i >= launches.length - 20) || now.getTime() - Date.parse(l.at) < 6 * 3_600_000);
  const infos = await runInfos(watched);
  const running = launches.filter((l) => l.runId && ["CREATING", "RUNNING"].includes(infos.get(l.runId)?.status ?? ""));
  const next = upcoming(schedule, now);
  const c = counts(data);
  const waiting = c.shortlisted + c.needsConfirm + c.readyToSubmit;
  const blanks = sections.flatMap((s) => s.answers).filter((a) => !a.answer && !NOT_BLANK.has(a.key)).length;

  const navBadges: Partial<Record<DeskTab, string>> = {};
  if (waiting) navBadges.today = String(waiting);
  if (blanks) navBadges.answers = String(blanks);
  if (running.length) navBadges.agents = "live";

  const runningBanner =
    running.length > 0 && tab !== "agents" ? (
      <div role="status" className="mb-6 flex flex-wrap items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
        <AutoRefresh every={30} />
        <span className="size-2 animate-pulse rounded-full bg-primary" aria-hidden />
        <span>{running.map((l) => `${KIND_LABEL[l.kind]} running since ${at(l.at, schedule.timezone)}`).join(". ")}.</span>
        <Link href="/?tab=agents" className="font-medium text-primary underline-offset-2 hover:underline">
          Open agents
        </Link>
      </div>
    ) : null;

  return (
    <DashboardLayout
      tab={tab}
      metrics={{ waiting, ready: c.readyToSubmit, applied: c.applied, contacted: c.invitesSent, ignored: c.ignored }}
      navBadges={navBadges}
      notice={
        <Notice
          done={typeof sp.done === "string" ? sp.done : undefined}
          error={typeof sp.error === "string" ? sp.error : undefined}
          started={typeof sp.started === "string" ? sp.started : undefined}
        />
      }
      runningBanner={runningBanner}
    >
      <PageHeader title={copy.title} description={copy.description} />

      {tab === "today" &&
        (data.jobs.length === 0 ? (
          <EmptyState title="No jobs in your pipeline yet">
            {next.length ? `Next search: ${next[0]} (${describeSchedule(schedule)}). ` : "Scheduled search is off. "}
            Use Find jobs now in the sidebar, and fill My answers so applications never stop on a blank field.
          </EmptyState>
        ) : (
          <Today jobs={data.jobs} settings={settings} />
        ))}
      {tab === "applications" && <Applications jobs={data.jobs} />}
      {tab === "outreach" && <Outreach jobs={data.jobs} back={back} />}
      {tab === "resumes" && <Resumes jobs={data.jobs} />}
      {tab === "ignored" && <Ignored jobs={data.jobs} />}
      {tab === "answers" && <Answers sections={sections} back={back} />}
      {tab === "agents" && (
        <Agents
          summaries={agentSummaries(data)}
          launches={launches}
          infos={infos}
          timezone={schedule.timezone}
          hasKey={!!cursorKey()}
          next={next}
          approvedCount={data.jobs.filter((j) => j.stage === "approved").length}
          agentConfig={agentConfig}
        />
      )}
      {tab === "schedule" && <ScheduleForm schedule={schedule} next={next} hasKey={!!cursorKey()} back={back} />}
      {tab === "runs" && <Runs runs={data.runs} />}
    </DashboardLayout>
  );
}

function DeskSkeleton() {
  return (
    <div className="flex min-h-svh animate-pulse bg-muted/30">
      <div className="hidden w-[260px] bg-sidebar lg:block" />
      <div className="flex-1 space-y-4 p-8">
        <div className="h-8 w-48 rounded bg-muted" />
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="h-16 rounded-lg bg-muted" />
          ))}
        </div>
        <div className="h-64 rounded-lg bg-muted" />
      </div>
    </div>
  );
}
