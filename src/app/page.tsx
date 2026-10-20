import fs from "node:fs";
import { connection } from "next/server";
import Link from "next/link";
import { Suspense } from "react";
import { logout } from "@/app/actions";
import { answerSections, NOT_BLANK } from "@/apply";
import { authEnabled } from "@/auth";
import { Answers } from "@/components/tracker/answers";
import { Applications, Ignored, Outreach, Resumes, Runs } from "@/components/tracker/tables";
import { Today } from "@/components/tracker/today";
import { Button } from "@/components/ui/button";
import { loadSettings, paths } from "@/settings";
import { readState } from "@/store";
import { counts, loadTracker } from "@/tracker";

export default function Page({ searchParams }: PageProps<"/">) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Shortlist</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            AI engineer roles from the last 24 hours, found at 4 am, 12 pm, and 8 pm. Approve a resume, answer a question, or mark an application as submitted right here.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" render={<a href="/export" />} nativeButton={false}>
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
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border px-4 py-3">
      <div className="text-2xl font-semibold tabular-nums tracking-tight">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

const TABS = ["today", "applications", "outreach", "resumes", "ignored", "answers", "runs"] as const;
type Tab = (typeof TABS)[number];

function Notice({ done, error }: { done?: string; error?: string }) {
  if (error) {
    return (
      <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        That did not save: {error}
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
  const { data, settings, sections } = state;
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
    ["runs", "Runs"],
  ];

  return (
    <div className="space-y-8">
      <Notice done={typeof sp.done === "string" ? sp.done : undefined} error={typeof sp.error === "string" ? sp.error : undefined} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="Waiting on you" value={waiting} />
        <Stat label="Ready to submit" value={c.readyToSubmit} />
        <Stat label="Applied" value={c.applied} />
        <Stat label="People contacted" value={c.invitesSent} />
        <Stat label="Not applied" value={c.ignored} />
      </div>
      <nav aria-label="Dashboard sections" className="flex w-full gap-1 overflow-x-auto rounded-lg bg-muted p-[3px] sm:w-fit">
        {nav.map(([key, label]) => (
          <Link
            key={key}
            href={key === "today" ? "/" : `/?tab=${key}`}
            aria-current={tab === key ? "page" : undefined}
            className={`whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-colors ${tab === key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            {label}
          </Link>
        ))}
      </nav>
      <div>
        {tab === "today" &&
          (data.jobs.length === 0 ? (
            <div className="rounded-xl border border-dashed p-10 text-center">
              <p className="font-medium">No jobs yet.</p>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                The next scheduled run fetches jobs from the last 24 hours and fills this page. While you wait, fill in the blanks on My answers so applications never stop.
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
