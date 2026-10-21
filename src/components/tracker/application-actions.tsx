"use client";

import { confirmSubmitted } from "@/app/actions";
import { applicationLinkMeta } from "@/application-url";
import type { JobRow } from "@/types";
import { cn } from "@/lib/utils";
import { CopyButton, SubmitButton } from "./client";

const gradientBtn =
  "inline-flex min-h-10 items-center justify-center rounded-lg bg-gradient-to-r from-indigo-600 via-violet-600 to-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-md ring-1 ring-white/10 transition hover:from-indigo-500 hover:via-violet-500 hover:to-blue-500 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400";

const gradientBtnSm =
  "inline-flex min-h-8 items-center justify-center rounded-md bg-gradient-to-r from-indigo-600 via-violet-600 to-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:from-indigo-500 hover:via-violet-500 hover:to-blue-500";

export function GoSubmitButton({
  url,
  label = "Go submit application",
  size = "md",
  className,
  onClick,
}: {
  url: string;
  label?: string;
  size?: "sm" | "md";
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}) {
  return (
    <a href={url} target="_blank" rel="noreferrer" className={cn(size === "sm" ? gradientBtnSm : gradientBtn, className)} onClick={onClick}>
      {label}
    </a>
  );
}

export function ApplicationUrlChip({ url, onClick }: { url: string; onClick?: (e: React.MouseEvent) => void }) {
  return (
    <div className="flex max-w-full flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs">
      <span className="shrink-0 font-medium text-muted-foreground">Application link</span>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="min-w-0 flex-1 truncate text-primary underline-offset-2 hover:underline"
        onClick={onClick}
      >
        {url}
      </a>
      <CopyButton text={url} label="Copy link" />
    </div>
  );
}

export function ReadyToSubmitPanel({
  jobId,
  url,
  title,
  company,
  accountEmail,
  compact,
}: {
  jobId: string;
  url: string;
  title: string;
  company: string;
  accountEmail?: string;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
        <GoSubmitButton url={url} size="sm" label="Submit now" />
      </div>
    );
  }

  return (
    <div
      className="rounded-xl bg-gradient-to-br from-indigo-600/10 via-violet-600/10 to-blue-600/10 p-4 ring-1 ring-violet-500/25 sm:p-5"
      onClick={(e) => e.stopPropagation()}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">Ready for you</p>
      <p className="mt-1 font-semibold text-foreground">
        {title} <span className="font-normal text-muted-foreground">at {company}</span>
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        The form is filled. Open the link below (saved application page when the agent finished). Sign in with{" "}
        {accountEmail ?? "vikasravikarjigi26@gmail.com"} if asked, review everything, then press Submit on their site.
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <GoSubmitButton url={url} label="Go submit this application →" />
        <form action={confirmSubmitted}>
          <input type="hidden" name="jobId" value={jobId} />
          <input type="hidden" name="back" value="/?tab=applications" />
          <SubmitButton variant="outline" pendingLabel="Saving…">
            I pressed Submit
          </SubmitButton>
        </form>
      </div>
      <div className="mt-3">
        <ApplicationUrlChip url={url} />
      </div>
    </div>
  );
}

export function ApplicationActionCell({ job }: { job: JobRow }) {
  const link = applicationLinkMeta(job);
  if (!link) return <span className="text-xs text-muted-foreground">No link yet</span>;

  if (job.stage === "ready_to_submit") {
    return (
      <ReadyToSubmitPanel
        jobId={job.id}
        url={link.url}
        title={job.title}
        company={job.company}
        accountEmail={job.applyPacket?.accountEmail}
        compact
      />
    );
  }

  if (job.stage === "approved" || job.stage === "apply_blocked" || job.stage === "awaiting_approval") {
    return (
      <a
        href={link.url}
        target="_blank"
        rel="noreferrer"
        className="text-xs font-medium text-primary underline-offset-2 hover:underline"
        onClick={(e) => e.stopPropagation()}
        title={job.applyPacket?.accountEmail ? `Sign in with ${job.applyPacket.accountEmail}` : undefined}
      >
        {link.label}
      </a>
    );
  }

  if (job.stage === "submitted") {
    return (
      <a
        href={link.url}
        target="_blank"
        rel="noreferrer"
        className="text-xs text-muted-foreground underline-offset-2 hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {link.label}
      </a>
    );
  }

  return (
    <a href={link.url} target="_blank" rel="noreferrer" className="text-xs text-primary underline-offset-2 hover:underline" onClick={(e) => e.stopPropagation()}>
      {link.label}
    </a>
  );
}
