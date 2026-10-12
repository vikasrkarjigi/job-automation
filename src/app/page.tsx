import { connection } from "next/server";
import { Suspense } from "react";
import { Applications, Ignored, People, Runs } from "@/components/tracker/tables";
import { Today } from "@/components/tracker/today";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { loadSettings } from "@/settings";
import { counts, loadTracker } from "@/tracker";

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Shortlist</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          AI engineer roles from the last 24 hours. Title, years, sponsorship, and agency checks run before your resume is touched, and the tailor only adds skills you can back up.
        </p>
      </header>
      <Suspense fallback={<DeskSkeleton />}>
        <Desk />
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

async function Desk() {
  await connection();
  const data = loadTracker();
  const settings = loadSettings();
  const c = counts(data);
  const waiting = c.shortlisted + c.needsConfirm + c.readyToSubmit;

  if (data.jobs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-10 text-center">
        <p className="font-medium">No jobs tracked yet.</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          The morning automation fills this page. To try it on sample postings, run <code className="rounded bg-muted px-1 py-0.5 text-xs">npm run demo</code> and start the app with{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">npm run dev:demo</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="Waiting on you" value={waiting} />
        <Stat label="Ready to submit" value={c.readyToSubmit} />
        <Stat label="Applied" value={c.applied} />
        <Stat label="Invites sent" value={c.invitesSent} />
        <Stat label="Ignored" value={c.ignored} />
      </div>
      <Tabs defaultValue="today">
        <TabsList className="w-full justify-start overflow-x-auto sm:w-fit">
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="people">People ({c.people})</TabsTrigger>
          <TabsTrigger value="ignored">Ignored ({c.ignored})</TabsTrigger>
          <TabsTrigger value="runs">Runs</TabsTrigger>
        </TabsList>
        <TabsContent value="today" className="pt-4">
          <Today jobs={data.jobs} settings={settings} />
        </TabsContent>
        <TabsContent value="applications" className="pt-4">
          <Applications jobs={data.jobs} />
        </TabsContent>
        <TabsContent value="people" className="pt-4">
          <People jobs={data.jobs} />
        </TabsContent>
        <TabsContent value="ignored" className="pt-4">
          <Ignored jobs={data.jobs} />
        </TabsContent>
        <TabsContent value="runs" className="pt-4">
          <Runs runs={data.runs} />
        </TabsContent>
      </Tabs>
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
