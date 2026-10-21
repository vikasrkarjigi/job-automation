import Link from "next/link";
import type { JobRow } from "@/types";
import { StageBadge } from "./bits";
import { cn } from "@/lib/utils";

export function JobSummaryRow({
  job,
  trailing,
  className,
}: {
  job: JobRow;
  trailing?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-2 border-b border-border px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{job.title}</p>
          <StageBadge stage={job.stage} />
        </div>
        <p className="text-sm text-muted-foreground">
          {job.company} · {job.location}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-3">{trailing}</div>
    </div>
  );
}

export function ResumeRowLinks({ jobId }: { jobId: string }) {
  return (
    <span className="flex gap-2 text-xs">
      <Link className="text-primary underline-offset-2 hover:underline" href={`/resume/${jobId}`}>
        View
      </Link>
      <Link className="text-primary underline-offset-2 hover:underline" href={`/resume/${jobId}/pdf`}>
        PDF
      </Link>
    </span>
  );
}
