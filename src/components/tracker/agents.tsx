import Link from "next/link";
import { startAgent } from "@/app/actions";
import type { AgentId, AgentSummary } from "@/agent-activity";
import { ACTIVE, modelLabel, type RunInfo } from "@/cloud";
import type { Launch, RunKind } from "@/schedule";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ContentCard, SectionLabel } from "./design";
import { AutoRefresh, SubmitButton } from "./client";

export const KIND_LABEL: Record<RunKind, string> = { fetch: "Find jobs", apply: "Fill applications" };
const RUNS_AGENTS: Record<RunKind, AgentId[]> = { fetch: ["scout", "ats", "tailor"], apply: ["apply", "outreach"] };

const STATUS_LABEL: Record<RunInfo["status"], string> = {
  CREATING: "Starting",
  RUNNING: "Running",
  FINISHED: "Finished",
  ERROR: "Failed",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
};

export function at(iso: string, timezone: string): string {
  return new Date(iso).toLocaleString("en-US", { timeZone: timezone, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function took(ms: number | null): string {
  if (!ms) return "";
  const min = Math.round(ms / 60_000);
  return min < 1 ? "under a minute" : `${min} min`;
}

export function RunNowButton({ kind, disabled, variant = "default" }: { kind: RunKind; disabled?: boolean; variant?: "default" | "outline" }) {
  return (
    <form action={startAgent}>
      <input type="hidden" name="kind" value={kind} />
      <SubmitButton size="sm" variant={variant} disabled={disabled} pendingLabel="Starting...">
        {kind === "fetch" ? "Find jobs now" : "Fill approved applications"}
      </SubmitButton>
    </form>
  );
}

function launchStatus(l: Launch, info: RunInfo | undefined): { label: string; tone: "live" | "ok" | "bad" | "muted" } {
  if (l.error) return { label: l.error.startsWith("Skipped") ? "Skipped" : "Did not start", tone: l.error.startsWith("Skipped") ? "muted" : "bad" };
  if (!l.runId) return { label: "Starting", tone: "live" };
  if (!info) return { label: "Unknown", tone: "muted" };
  const tone = ACTIVE.includes(info.status) ? "live" : info.status === "FINISHED" ? "ok" : "bad";
  return { label: STATUS_LABEL[info.status], tone };
}

function StatusBadge({ label, tone }: { label: string; tone: "live" | "ok" | "bad" | "muted" }) {
  if (tone === "live") {
    return (
      <Badge variant="secondary" className="gap-1.5">
        <span className="size-1.5 animate-pulse rounded-full bg-primary" aria-hidden />
        {label}
      </Badge>
    );
  }
  return <Badge variant={tone === "ok" ? "default" : tone === "bad" ? "destructive" : "outline"}>{label}</Badge>;
}

function SetupNeeded() {
  return (
    <ContentCard className="border-amber-500/30 bg-amber-500/5 p-5 text-sm">
      <p className="font-medium">Add CURSOR_API_KEY in Vercel</p>
      <p className="mt-1 text-muted-foreground">Settings → Environment Variables → redeploy Production. Then Find jobs now starts cloud agents from this page.</p>
    </ContentCard>
  );
}

export function Agents({
  summaries,
  launches,
  infos,
  timezone,
  hasKey,
  next,
  approvedCount,
}: {
  summaries: AgentSummary[];
  launches: Launch[];
  infos: Map<string, RunInfo>;
  timezone: string;
  hasKey: boolean;
  next: string[];
  approvedCount: number;
}) {
  const recent = [...launches].reverse();
  const live = recent.filter((l) => launchStatus(l, l.runId ? infos.get(l.runId) : undefined).tone === "live");
  const working = new Set(live.flatMap((l) => RUNS_AGENTS[l.kind]));
  const busy = (kind: RunKind) => live.some((l) => l.kind === kind);

  return (
    <div className="space-y-8">
      {live.length > 0 && <AutoRefresh />}
      {!hasKey && <SetupNeeded />}

      <ContentCard className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1 text-sm">
          {live.length ? (
            live.map((l) => (
              <p key={l.at} className="flex flex-wrap items-center gap-2">
                <StatusBadge label="Running" tone="live" />
                <span>
                  {KIND_LABEL[l.kind]}, {at(l.at, timezone)}
                  {l.model ? ` · ${modelLabel(l.model)}` : ""}
                </span>
                {l.url && (
                  <a href={l.url} target="_blank" rel="noreferrer" className="font-medium text-primary underline-offset-2 hover:underline">
                    Watch in Cursor
                  </a>
                )}
              </p>
            ))
          ) : (
            <p className="font-medium text-foreground">No cloud run in progress</p>
          )}
          <p className="text-muted-foreground">
            {next.length ? (
              <>
                Next scheduled search: {next[0]}.{" "}
                <Link href="/?tab=schedule" className="text-primary underline-offset-2 hover:underline">
                  Edit schedule
                </Link>
                {" · "}
                <Link href="/?tab=models" className="text-primary underline-offset-2 hover:underline">
                  Cloud models
                </Link>
                {" · "}
                <Link href="/?tab=guides" className="text-primary underline-offset-2 hover:underline">
                  Agent guides
                </Link>
                {" · "}
                <Link href="/?tab=guides" className="text-primary underline-offset-2 hover:underline">
                  Agent guides
                </Link>
              </>
            ) : (
              <>
                Schedule is off.{" "}
                <Link href="/?tab=schedule" className="text-primary underline-offset-2 hover:underline">
                  Turn on
                </Link>
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <RunNowButton kind="fetch" disabled={!hasKey || busy("fetch")} />
          <RunNowButton kind="apply" variant="outline" disabled={!hasKey || busy("apply") || approvedCount === 0} />
        </div>
      </ContentCard>

      <div>
        <SectionLabel>Pipeline agents</SectionLabel>
        <section aria-label="Agents" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {summaries.map((a) => (
            <ContentCard key={a.id} className={`flex flex-col p-4 ${working.has(a.id) ? "ring-1 ring-primary/30" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold">{a.name}</h3>
                {working.has(a.id) ? (
                  <StatusBadge label="Working" tone="live" />
                ) : a.waitingOnYou ? (
                  <Badge variant="secondary">Needs you ({a.waitingOnYou})</Badge>
                ) : (
                  <Badge variant="outline">Idle</Badge>
                )}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{a.role}</p>
              <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-4">
                {a.stats.map((s) => (
                  <div key={s.label}>
                    <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{s.label}</dt>
                    <dd className="mt-0.5 text-lg font-semibold tabular-nums">{s.value}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-4 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Latest</p>
                {a.recent.length ? (
                  <ul className="mt-2 space-y-2">
                    {a.recent.map((r, i) => (
                      <li key={`${r.jobId}-${i}`} className="text-xs leading-relaxed">
                        <span className="font-medium">{r.job}</span>
                        <span className="text-muted-foreground"> — {r.note}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">Waiting for the next job search.</p>
                )}
              </div>
            </ContentCard>
          ))}
        </section>
      </div>

      <div>
        <SectionLabel>Run history</SectionLabel>
        {recent.length === 0 ? (
          <ContentCard className="border-dashed p-8 text-center text-sm text-muted-foreground">Runs started here or by the schedule appear below.</ContentCard>
        ) : (
          <ContentCard className="divide-y divide-border overflow-hidden">
            {recent.slice(0, 20).map((l) => {
              const info = l.runId ? infos.get(l.runId) : undefined;
              const status = launchStatus(l, info);
              return (
                <div key={`${l.at}-${l.kind}`} className="flex flex-col gap-2 p-4 text-sm sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{KIND_LABEL[l.kind]}</span>
                      <StatusBadge {...status} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {at(l.at, timezone)} · {l.trigger === "schedule" ? "scheduled" : "manual"}
                      {l.model ? ` · ${modelLabel(l.model)}` : ""}
                      {info?.durationMs ? ` · ${took(info.durationMs)}` : ""}
                    </p>
                    {l.error && <p className="text-xs text-destructive">{l.error}</p>}
                    {info?.result && (
                      <details className="text-xs text-muted-foreground">
                        <summary className="cursor-pointer select-none font-medium text-foreground">Summary</summary>
                        <p className="mt-1 whitespace-pre-wrap">{info.result}</p>
                      </details>
                    )}
                  </div>
                  {l.url && (
                    <Button size="sm" variant="outline" render={<a href={l.url} target="_blank" rel="noreferrer" />} nativeButton={false}>
                      Open in Cursor
                    </Button>
                  )}
                </div>
              );
            })}
          </ContentCard>
        )}
      </div>
    </div>
  );
}
