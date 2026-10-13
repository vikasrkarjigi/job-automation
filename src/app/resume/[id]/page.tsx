import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { StageBadge } from "@/components/tracker/bits";
import { PrintButton } from "@/components/tracker/print-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { loadBaseResume } from "@/profile";
import { parseResume, type ResumeBlock } from "@/resume-view";
import { root } from "@/settings";
import { loadTracker } from "@/tracker";

export default function ResumePage({ params }: PageProps<"/resume/[id]">) {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <Suspense fallback={<div className="h-[70vh] animate-pulse rounded-xl bg-muted" aria-busy />}>
        <Resume params={params} />
      </Suspense>
    </main>
  );
}

async function Resume({ params }: { params: PageProps<"/resume/[id]">["params"] }) {
  await connection();
  const { id } = await params;
  const job = loadTracker().jobs.find((j) => j.id === id);
  if (!job) notFound();
  const rel = job.submittedResumePath ?? job.resumePath;
  const file = rel ? path.join(root(), rel) : null;
  if (!file || !file.startsWith(path.join(root(), "resumes") + path.sep) || !fs.existsSync(file)) {
    return (
      <div className="rounded-xl border border-dashed p-10 text-center">
        <p className="font-medium">No tailored resume for {job.company} yet.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          This job is {job.stage.replace(/_/g, " ")}. The tailor only writes a resume after every basic check passes{job.reason ? `, and it stopped here: ${job.reason}` : "."}
        </p>
        <Button className="mt-4" variant="outline" render={<Link href="/" />} nativeButton={false}>
          Back to the tracker
        </Button>
      </div>
    );
  }
  const doc = parseResume(fs.readFileSync(file, "utf8"), loadBaseResume());
  const renames = job.analysis?.renames ?? [];
  const renamedTo = new Map(renames.map((r) => [r.to.toLowerCase(), r.from]));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 print:hidden sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Tracker
          </Link>
          <h1 className="text-xl font-semibold tracking-tight">
            {job.title} at {job.company}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <StageBadge stage={job.stage} />
            <span>
              ATS {job.scoreBefore ?? "?"} → {job.scoreAfter ?? "?"}
            </span>
            <span className="font-mono text-xs">{rel}</span>
            {job.submittedResumePath && <Badge variant="outline">Exact file you submitted</Badge>}
          </div>
        </div>
        <div className="flex gap-2">
          <PrintButton />
          <Button variant="outline" render={<a href={`/resume/${job.id}/tex`} download={`${job.id}.tex`} />} nativeButton={false}>
            Download .tex
          </Button>
        </div>
      </div>

      <div className="grid gap-3 print:hidden sm:grid-cols-3">
        <Summary label="Bullets added" value={doc.changes.newBullets} />
        <Summary label="Bullets reworded" value={doc.changes.editedBullets} />
        <Summary label="Skills added or renamed" value={doc.changes.addedSkills.length} />
      </div>
      {(renames.length > 0 || job.tailorNotes.length > 0) && (
        <ul className="space-y-1 rounded-xl border bg-muted/40 p-4 text-sm print:hidden">
          {renames.map((r) => (
            <li key={r.from + r.to}>
              Renamed <b>{r.from}</b> to <b>{r.to}</b>, same skill family
            </li>
          ))}
          {job.tailorNotes.map((n) => (
            <li key={n} className="text-muted-foreground">
              {n}
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground print:hidden">
        <mark className="rounded bg-emerald-100 px-1 dark:bg-emerald-900/50">Green</mark> is new from evidence,{" "}
        <mark className="rounded bg-amber-100 px-1 dark:bg-amber-900/50">amber</mark> is reworded from your base resume. Highlights disappear when you print or save as PDF.
      </p>

      <article className="rounded-xl border bg-white p-8 font-serif text-[13.5px] leading-relaxed text-neutral-900 shadow-sm print:border-0 print:p-0 print:shadow-none sm:p-12">
        <header className="mb-4 text-center">
          {doc.header.map((h, i) => (
            <p key={i} className={i === 0 ? "text-2xl font-bold" : "text-xs text-neutral-600"}>
              {h}
            </p>
          ))}
        </header>
        {doc.sections.map((s) => (
          <section key={s.title} className="mb-4">
            <h2 className="mb-2 border-b border-neutral-300 pb-0.5 text-sm font-bold uppercase tracking-wider">{s.title}</h2>
            <Blocks blocks={s.blocks} renamedTo={renamedTo} />
          </section>
        ))}
      </article>
    </div>
  );
}

function Blocks({ blocks, renamedTo }: { blocks: ResumeBlock[]; renamedTo: Map<string, string> }) {
  const out: React.ReactNode[] = [];
  let bullets: React.ReactNode[] = [];
  const flush = () => {
    if (bullets.length) out.push(<ul key={`ul${out.length}`} className="mb-2 list-disc space-y-1 pl-5">{bullets}</ul>);
    bullets = [];
  };
  blocks.forEach((b, i) => {
    if (b.kind === "bullet") {
      const tone = b.change === "new" ? "bg-emerald-100 print:bg-transparent" : b.change === "edited" ? "bg-amber-100 print:bg-transparent" : "";
      bullets.push(
        <li key={i} className={tone ? `${tone} -mx-1 rounded px-1` : undefined} title={b.change === "same" ? undefined : `${b.text.length} characters`}>
          {b.runs.map((r, j) => (r.bold ? <b key={j}>{r.text}</b> : <span key={j}>{r.text}</span>))}
        </li>,
      );
      return;
    }
    flush();
    if (b.kind === "entry") {
      out.push(
        <div key={i} className="mt-2 flex flex-wrap justify-between gap-x-4 font-semibold">
          {b.parts.map((p, j) => (
            <span key={j} className={j > 0 ? "font-normal text-neutral-600" : undefined}>
              {p}
            </span>
          ))}
        </div>,
      );
    }
    if (b.kind === "text") out.push(<p key={i}>{b.text}</p>);
    if (b.kind === "skills") {
      out.push(
        <p key={i}>
          <b>{b.label}:</b>{" "}
          {b.items.map((it, j) => (
            <span key={j}>
              {j > 0 && ", "}
              {it.added ? (
                <mark className="rounded bg-emerald-100 px-0.5 print:bg-transparent" title={renamedTo.has(it.text.toLowerCase()) ? `renamed from ${renamedTo.get(it.text.toLowerCase())}` : "added from evidence or your confirmation"}>
                  {it.text}
                </mark>
              ) : (
                it.text
              )}
            </span>
          ))}
        </p>,
      );
    }
  });
  flush();
  return <>{out}</>;
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border px-4 py-3">
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
