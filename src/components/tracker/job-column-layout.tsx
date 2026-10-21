"use client";

import type { Stage } from "@/types";
import { cn } from "@/lib/utils";
import { stageStyles } from "./stage-styles";

/** Shared column grid for row view on job lists. */
export const JOB_ROW_GRID =
  "grid w-full grid-cols-1 items-start gap-y-2 px-4 py-3 md:grid-cols-[minmax(0,1.35fr)_minmax(5.5rem,auto)_minmax(0,1.1fr)_4.25rem_4.5rem_minmax(5rem,auto)] md:items-center md:gap-x-3 md:gap-y-1";

export function JobColumnHeader({ labels }: { labels: string[] }) {
  return (
    <div
      className={cn(
        JOB_ROW_GRID,
        "border-b border-border bg-muted/40 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground max-md:hidden",
      )}
    >
      {labels.map((l) => (
        <span key={l} className={l === "Score" || l === "People" ? "text-right" : undefined}>
          {l}
        </span>
      ))}
    </div>
  );
}

export function JobColumnRow({
  stage,
  className,
  onClick,
  children,
}: {
  stage: Stage;
  className?: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  const { rail } = stageStyles(stage);
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
      onClick={onClick}
      className={cn(
        JOB_ROW_GRID,
        "border-b border-border/80 bg-card text-sm transition-colors last:border-b-0",
        "border-l-[3px]",
        rail,
        onClick && "cursor-pointer hover:bg-muted/35",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function JobTile({
  stage,
  className,
  children,
  onClick,
}: {
  stage: Stage;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  const { tile, rail } = stageStyles(stage);
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
      className={cn(
        "flex flex-col rounded-xl border border-border bg-card p-4 shadow-sm ring-1 ring-inset transition-shadow hover:shadow-md",
        "border-l-4",
        rail,
        tile,
        onClick && "cursor-pointer",
        className,
      )}
    >
      {children}
    </div>
  );
}
