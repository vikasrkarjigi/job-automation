import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { JobRow, RunRecord } from "@/types";
import { applyRunSnapshot, type ApplyRunSnapshot } from "@/apply-transparency";
import type { RunInfo } from "@/run-info";
import type { Launch } from "@/types";
import { when } from "./bits";
import { ContentCard, EmptyState } from "./design";
import { filterJobsBySearch } from "@/job-search";
import { SearchHint } from "./dashboard-search";
import { ApplicationsList } from "./applications-list";
import { IgnoredList } from "./ignored-list";
import { OutreachList } from "./outreach-list";
import { ResumeList } from "./resume-list";

function Empty({ title, children }: { title: string; children: React.ReactNode }) {
  return <EmptyState title={title}>{children}</EmptyState>;
}

export function Resumes({ jobs, query }: { jobs: JobRow[]; query?: string }) {
  const all = jobs.filter((j) => j.resumePath).sort((a, b) => (b.submittedAt ?? b.createdAt).localeCompare(a.submittedAt ?? a.createdAt));
  const rows = filterJobsBySearch(all, query);
  if (!all.length) return <Empty title="No tailored resumes">One is written for every job that clears the basic checks.</Empty>;
  if (!rows.length) return <Empty title="No resumes match your search">Try company, city, job title, or part of the job id.</Empty>;
  return (
    <>
      <SearchHint query={query} total={all.length} shown={rows.length} />
      <ResumeList rows={rows} />
    </>
  );
}

export function Applications({ jobs, launches, infos, query }: { jobs: JobRow[]; launches: Launch[]; infos: Map<string, RunInfo>; query?: string }) {
  const all = jobs.filter((j) => j.stage !== "ignored").sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const rows = filterJobsBySearch(all, query);
  const applyRun: ApplyRunSnapshot = applyRunSnapshot(launches, infos);
  if (!all.length) return <Empty title="No applications yet">Jobs that fail a check appear under Ignored with the reason.</Empty>;
  if (!rows.length) return <Empty title="No applications match your search">Search matches title, company, city, stage, score, and job id — not exact keywords only.</Empty>;
  return (
    <>
      <SearchHint query={query} total={all.length} shown={rows.length} />
      <ApplicationsList rows={rows} applyRun={applyRun} />
    </>
  );
}

export function Outreach({ jobs, back, query }: { jobs: JobRow[]; back: string; query?: string }) {
  const all = jobs.filter((j) => j.people.length);
  const withPeople = filterJobsBySearch(all, query);
  if (!all.length) {
    return <Empty title="No outreach yet">After you approve a job, the agent finds up to five people from Apollo or Vibe and drafts a note for each.</Empty>;
  }
  if (!withPeople.length) return <Empty title="No outreach matches your search">Try the company or job title.</Empty>;
  return (
    <>
      <SearchHint query={query} total={all.length} shown={withPeople.length} />
      <OutreachList jobs={withPeople} back={back} />
    </>
  );
}

export function Ignored({ jobs, query }: { jobs: JobRow[]; query?: string }) {
  const all = jobs.filter((j) => j.stage === "ignored" || j.stage === "skipped_by_you");
  const rows = filterJobsBySearch(all, query);
  if (!all.length) return <Empty title="Nothing ignored">Jobs you skip or that fail filters will appear here.</Empty>;
  if (!rows.length) return <Empty title="Nothing matches your search">Try company, filter reason, or job title.</Empty>;
  return (
    <>
      <SearchHint query={query} total={all.length} shown={rows.length} />
      <IgnoredList rows={rows} />
    </>
  );
}

export function Runs({ runs }: { runs: RunRecord[] }) {
  if (!runs.length) return <Empty title="No runs logged">Pipeline runs appear here after a job search or approval batch.</Empty>;
  return (
    <ContentCard className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Run</TableHead>
            <TableHead className="text-right">Fetched</TableHead>
            <TableHead className="text-right">Older than 24h</TableHead>
            <TableHead className="text-right">Passed filters</TableHead>
            <TableHead className="text-right">Shortlisted</TableHead>
            <TableHead className="text-right">Ignored</TableHead>
            <TableHead>Failures</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...runs].reverse().map((r) => (
            <TableRow key={r.id}>
              <TableCell>
                <div className="text-sm">{when(r.startedAt)}</div>
                <div className="text-xs text-muted-foreground">{r.kind === "morning" ? r.note || "Morning run" : "After approval"}</div>
              </TableCell>
              <TableCell className="text-right tabular-nums">{r.fetched}</TableCell>
              <TableCell className="text-right tabular-nums">{r.droppedStale}</TableCell>
              <TableCell className="text-right tabular-nums">{r.passedFilters}</TableCell>
              <TableCell className="text-right tabular-nums">{r.shortlisted}</TableCell>
              <TableCell className="text-right tabular-nums">{r.ignored}</TableCell>
              <TableCell className="whitespace-normal text-xs">
                {r.failed.length ? r.failed.map((f) => `${f.jobId}: ${f.error}`).join("; ") : <span className="text-muted-foreground">none</span>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ContentCard>
  );
}
