import type { Stage } from "@/types";
import { cn } from "@/lib/utils";

export const STAGE_LABEL: Record<Stage, string> = {
  ignored: "Ignored",
  scoring: "Scoring",
  needs_confirm: "Keyword question",
  awaiting_approval: "Awaiting you",
  skipped_by_you: "Skipped",
  approved: "Filling form",
  apply_blocked: "Blocked",
  ready_to_submit: "Ready to submit",
  submitted: "Submitted",
};

/** Badge + row accent colors per pipeline stage. */
export function stageStyles(stage: Stage) {
  switch (stage) {
    case "awaiting_approval":
      return {
        badge: "border-amber-400/60 bg-amber-500/15 text-amber-950 dark:text-amber-100",
        rail: "border-l-amber-500",
        tile: "ring-amber-500/25 hover:ring-amber-500/40",
      };
    case "needs_confirm":
      return {
        badge: "border-orange-400/60 bg-orange-500/15 text-orange-950 dark:text-orange-100",
        rail: "border-l-orange-500",
        tile: "ring-orange-500/25 hover:ring-orange-500/40",
      };
    case "approved":
      return {
        badge: "border-sky-400/60 bg-sky-500/15 text-sky-950 dark:text-sky-100",
        rail: "border-l-sky-500",
        tile: "ring-sky-500/25 hover:ring-sky-500/40",
      };
    case "apply_blocked":
      return {
        badge: "border-rose-500/70 bg-rose-500/15 text-rose-950 dark:text-rose-100",
        rail: "border-l-rose-500",
        tile: "ring-rose-500/30 hover:ring-rose-500/50",
      };
    case "ready_to_submit":
      return {
        badge: "border-emerald-500/70 bg-emerald-500/15 text-emerald-950 dark:text-emerald-100",
        rail: "border-l-emerald-500",
        tile: "ring-emerald-500/30 hover:ring-emerald-500/45",
      };
    case "submitted":
      return {
        badge: "border-emerald-600/80 bg-emerald-600/20 text-emerald-950 dark:text-emerald-50 font-medium",
        rail: "border-l-emerald-600",
        tile: "ring-emerald-600/35",
      };
    case "skipped_by_you":
      return {
        badge: "border-border bg-muted/80 text-muted-foreground",
        rail: "border-l-muted-foreground/40",
        tile: "ring-border",
      };
    case "ignored":
      return {
        badge: "border-border bg-muted/60 text-muted-foreground line-through decoration-muted-foreground/30",
        rail: "border-l-muted-foreground/30",
        tile: "ring-border opacity-90",
      };
    default:
      return {
        badge: "border-border bg-muted/50 text-muted-foreground",
        rail: "border-l-border",
        tile: "ring-border",
      };
  }
}

export function stageBadgeClass(stage: Stage) {
  return cn("inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide", stageStyles(stage).badge);
}

export const LEGEND_ITEMS: { stage: Stage; label: string }[] = [
  { stage: "awaiting_approval", label: "Awaiting your approve/skip" },
  { stage: "needs_confirm", label: "Keyword question" },
  { stage: "approved", label: "Apply agent filling form" },
  { stage: "apply_blocked", label: "Blocked — needs you" },
  { stage: "ready_to_submit", label: "Ready — you press Submit" },
  { stage: "submitted", label: "Submitted" },
  { stage: "ignored", label: "Filtered / not applied" },
];
