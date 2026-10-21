import fs from "node:fs";
import { connection } from "next/server";
import Link from "next/link";
import { Suspense } from "react";
import { logout, startAgent } from "@/app/actions";
import { agentSummaries } from "@/agent-activity";
import { answerSections, NOT_BLANK } from "@/apply";
import { authEnabled } from "@/auth";
import { cursorKey, runInfos } from "@/cloud";
import { Agents, KIND_LABEL, at } from "@/components/tracker/agents";
import { Answers } from "@/components/tracker/answers";
import { AutoRefresh, SubmitButton } from "@/components/tracker/client";
import { ScheduleForm } from "@/components/tracker/schedule";
import { Applications, Ignored, Outreach, Resumes, Runs } from "@/components/tracker/tables";
import { Today } from "@/components/tracker/today";
import { PageShell, StatCard, TabNav } from "@/components/tracker/shell";
import { Button } from "@/components/ui/button";
import { loadAgentConfig } from "@/agent-config";
import { loadSettings, paths } from "@/settings";
import { describeSchedule, loadLaunches, loadSchedule, upcoming } from "@/schedule";
import { readState } from "@/store";
import { counts, loadTracker } from "@/tracker";

export default function Page({ searchParams }: PageProps<"/">) {
  return (
    <PageShell>
      <header className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--brand)]">Job pipeline</p>
          <h1 className="bg-gradient-to-br from-foreground via-foreground to-[var(--brand)] bg-clip-text text-3xl font-semibold tracking-tight text-transparent sm:text-4xl">
            Shortlist
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
            AI engineer roles from the last 24 hours. Search on demand, pick your cloud agent models, approve tailored resumes, and track every application in one place.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <form action={startAgent}>
            <input type="hidden" name="kind" value="fetch" />
            <SubmitButton pendingLabel="Starting..." className="btn-glow">
              Find jobs now
            </SubmitButton>
          </form>
          <Button variant="outline" className="border-border/80 bg-card/60 backdrop-blur-sm" render={<Link href="/?tab=agents" />} nativeButton={false}>
            Agents
          </Button>
          <Button variant="outline" className="border-border/80 bg-card/60 backdrop-blur-sm" render={<Link href="/?tab=schedule" />} nativeButton={false}>
            Schedule
          </Button>
          <Button variant="outline" className="border-border/80 bg-card/60 backdrop-blur-sm" render={<a href="/export" />} nativeButton={false}>
            Download Excel
          </Button>
          {authEnabled() && (
            <form action={logout}>
              <Button type="submit" variant="ghost">
                Log out
              </Button>
            </form>
          )}
        </div>
      </header>
      <Suspense fallback={<DeskSkeleton />}>
        <Desk searchParams={searchParams} />
      </Suspense>
    </PageShell>
  );
}

const TABS = ["today", "applications", "outreach", "resumes", "ignored", "answers", "agents", "schedule", "runs"] as const;
type Tab = (typeof TABS)[number];

function Notice({ done, error, started }: { done?: string; error?: string; started?: string }) {
  if (error) {
    return (
      <div role="alert" className="glass-panel border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        That did not save: {error}
      </div>
    );
  }
  if (started) {
    return (
      <div role="status" className="glass-panel border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-900 dark:text-emerald-100">
        {started}.
      </div>
    );
  }
  if (done) {
    return (
      <div role="status" className="rounded-xl border border-emerald-600/30 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300">
        {done}. Saved.
      </div>
    );
  }
  return null;
}

async function Desk({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  await connection();
  const sp = await searchParams;
  const tab: Tab = TABS.includes(sp.tab as Tab) ? (sp.tab as Tab) : "today";
  const back = tab === "today" ? "/" : `/?tab=${tab}`;

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
      <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm">
        <p className="font-medium text-destructive">Could not read your pipeline from GitHub.</p>
        <p className="mt-1 text-muted-foreground">{err instanceof Error ? err.message : String(err)}</p>
        <p className="mt-2 text-muted-foreground">Check that SHORTLIST_GITHUB_TOKEN in Vercel can read and write vikasrkarjigi/job-automation.</p>
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

  const nav: [Tab, string][] = [
    ["today", waiting ? `Today (${waiting})` : "Today"],
    ["applications", `Applications (${data.jobs.filter((j) => j.stage !== "ignored").length})`],
    ["outreach", `Outreach (${c.people})`],
    ["resumes", `Resumes (${data.jobs.filter((j) => j.resumePath).length})`],
    ["ignored", `Ignored (${c.ignored})`],
    ["answers", blanks ? `My answers (${blanks} blank)` : "My answers"],
    ["agents", running.length ? "Agents (running)" : "Agents"],
    ["schedule", "Schedule"],
    ["runs", "Run log"],
  ];

  return (
    <div className="space-y-8">
      <Notice
        done={typeof sp.done === "string" ? sp.done : undefined}
        error={typeof sp.error === "string" ? sp.error : undefined}
        started={typeof sp.started === "string" ? sp.started : undefined}
      />
      {running.length > 0 && tab !== "agents" && (
        <div role="status" className="glass-panel flex flex-wrap items-center gap-2 px-4 py-3 text-sm">
          <AutoRefresh every={30} />
          <span className="size-2 animate-pulse rounded-full bg-emerald-500" aria-hidden />
          <span>
            {running.map((l) => `${KIND_LABEL[l.kind]} is running, started ${at(l.at, schedule.timezone)}`).join(". ")}.
          </span>
          <Link href="/?tab=agents" className="underline underline-offset-2">
            See the agents
          </Link>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard label="Waiting on you" value={waiting} highlight={waiting > 0} />
        <StatCard label="Ready to submit" value={c.readyToSubmit} highlight={c.readyToSubmit > 0} />
        <StatCard label="Applied" value={c.applied} />
        <StatCard label="People contacted" value={c.invitesSent} />
        <StatCard label="Not applied" value={c.ignored} />
      </div>
      <TabNav
        items={nav.map(([key, label]) => ({
          key,
          label,
          href: key === "today" ? "/" : `/?tab=${key}`,
          active: tab === key,
        }))}
      />
      <div>
        {tab === "today" &&
          (data.jobs.length === 0 ? (
            <div className="glass-panel border-dashed p-10 text-center">
              <p className="font-medium">No jobs yet.</p>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                {next.length ? `The next search runs ${next[0]} (${describeSchedule(schedule)}). ` : "Scheduled searches are off. "}
                Press Find jobs now to search right away. While you wait, fill in the blanks on My answers so applications never stop.
              </p>
            </div>
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
      </div>
    </div>
  );
}

function DeskSkeleton() {
  return (
    <div className="space-y-8" aria-busy>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="h-[66px] animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
      <div className="h-8 w-80 animate-pulse rounded-lg bg-muted" />
      <div className="h-48 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}
