import type { JobRow, Stage } from "@/types";
import { STAGE_LABEL, stageBadgeClass } from "./stage-styles";

export { statusLine } from "@/status";
export { STAGE_LABEL } from "./stage-styles";

export function StageBadge({ stage }: { stage: Stage }) {
  return <span className={stageBadgeClass(stage)}>{STAGE_LABEL[stage]}</span>;
}

export function ago(iso: string | null, now = Date.now()): string {
  if (!iso) return "";
  const h = Math.max(0, Math.round((now - Date.parse(iso)) / 3_600_000));
  if (h < 1) return "just now";
  if (h < 48) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function when(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

const BOARD_LABEL = { indeed: "Indeed", linkedin: "LinkedIn", jobright: "Jobright" } as const;

export function Sources({ job }: { job: JobRow }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {job.sources.map((s) => (
        <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
          {BOARD_LABEL[s.board]}
        </a>
      ))}
    </span>
  );
}

export function Score({ before, after, target }: { before: number | null; after: number | null; target: number }) {
  return (
    <div className="flex items-baseline gap-2 tabular-nums">
      <span className="text-sm text-muted-foreground">{before ?? "?"}</span>
      <span className="text-xs text-muted-foreground">to</span>
      <span className="text-2xl font-semibold tracking-tight">{after ?? "?"}</span>
      {after !== null && after < target && <span className="text-xs text-muted-foreground">honest result, target {target}</span>}
    </div>
  );
}

export function KeywordChips({ job }: { job: JobRow }) {
  const a = job.analysis;
  if (!a) return null;
  const renamed = new Map(a.renames.map((r) => [r.to, r.from]));
  return (
    <div className="flex flex-wrap gap-1.5">
      {a.keywords.map((k) => {
        const status = a.matched.includes(k.term)
          ? "had"
          : renamed.has(k.term)
            ? `from ${renamed.get(k.term)}`
            : a.unmentioned.includes(k.term)
              ? "added"
              : a.needsConfirm.includes(k.term)
                ? "ask"
                : "gap";
        const tone =
          status === "had"
            ? "border-border text-foreground"
            : status === "gap"
              ? "border-dashed border-border text-muted-foreground line-through decoration-muted-foreground/50"
              : status === "ask"
                ? "border-amber-500/50 text-amber-700 dark:text-amber-400"
                : "border-emerald-600/40 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400";
        return (
          <span key={k.term} className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs ${tone}`} title={`${k.tier}, weight ${k.weight}`}>
            {k.term}
            {status !== "had" && <span className="opacity-70">{status}</span>}
            {k.tier === "preferred" && <span className="opacity-50">pref</span>}
          </span>
        );
      })}
    </div>
  );
}
