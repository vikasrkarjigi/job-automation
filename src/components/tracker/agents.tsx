import Link from "next/link";
import { startAgent } from "@/app/actions";
import type { AgentId, AgentSummary } from "@/agent-activity";
import { ACTIVE, modelLabel, type RunInfo } from "@/cloud";
import type { Launch, RunKind } from "@/schedule";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
        <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" aria-hidden />
        {label}
      </Badge>
    );
  }
  return <Badge variant={tone === "ok" ? "default" : tone === "bad" ? "destructive" : "outline"}>{label}</Badge>;
}

function SetupNeeded() {
  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 text-sm">
      <p className="font-medium">One setting left before agents can start from here</p>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
        <li>
          In Vercel, open the job-automation project, then Settings, then Environment Variables, and add <code className="text-foreground">CURSOR_API_KEY</code> with your Cursor API key from
          cursor.com/dashboard, API Keys.
        </li>
        <li>Redeploy from the Deployments tab. The buttons on this page start working right after.</li>
      </ol>
    </div>
  );
}

function ModelChainInfo({ models }: { models: string[] }) {
  return (
    <div className="rounded-xl border p-4 text-sm">
      <p className="font-medium">Cloud agent models</p>
      <p className="mt-1 text-muted-foreground">
        Find jobs now starts a Cursor cloud VM using your <code className="text-foreground">CURSOR_API_KEY</code>. If one model is busy or limited, the next in this list is tried automatically. Composer, Grok, and Claude here are Cursor models, not separate Anthropic or xAI API keys.
      </p>
      <ol className="mt-3 flex flex-wrap gap-2">
        {models.map((m, i) => (
          <li key={m} className="rounded-md border px-2 py-1 text-xs">
            {i + 1}. {modelLabel(m)} <span className="text-muted-foreground">({m})</span>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-muted-foreground">
        If every model returns a usage limit error, open{" "}
        <a href="https://cursor.com/dashboard?tab=settings" className="underline underline-offset-2" target="_blank" rel="noreferrer">
          Cursor Settings
        </a>{" "}
        and turn on <strong className="font-medium text-foreground">on-demand usage</strong> for background agents, or wait for your plan to reset. Optional: set{" "}
        <code className="text-foreground">SHORTLIST_AGENT_MODELS</code> in Vercel (comma-separated ids, same order as above).
      </p>
    </div>
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
  models,
}: {
  summaries: AgentSummary[];
  launches: Launch[];
  infos: Map<string, RunInfo>;
  timezone: string;
  hasKey: boolean;
  next: string[];
  approvedCount: number;
  models: string[];
}) {
  const recent = [...launches].reverse();
  const live = recent.filter((l) => launchStatus(l, l.runId ? infos.get(l.runId) : undefined).tone === "live");
  const working = new Set(live.flatMap((l) => RUNS_AGENTS[l.kind]));
  const busy = (kind: RunKind) => live.some((l) => l.kind === kind);

  return (
    <div className="space-y-6">
      {live.length > 0 && <AutoRefresh />}
      {!hasKey && <SetupNeeded />}
      {hasKey && <ModelChainInfo models={models} />}

      <section className="flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1 text-sm">
          {live.length ? (
            live.map((l) => (
              <p key={l.at} className="flex flex-wrap items-center gap-2">
                <StatusBadge label="Running" tone="live" />
                <span>
                  {KIND_LABEL[l.kind]}, started {at(l.at, timezone)}
                  {l.trigger === "schedule" ? " by the schedule" : " by you"}
                  {l.model ? ` on ${modelLabel(l.model)}` : ""}.
                </span>
                {l.url && (
                  <a href={l.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                    Watch it work
                  </a>
                )}
              </p>
            ))
          ) : (
            <p className="font-medium">No agent is running right now.</p>
          )}
          <p className="text-muted-foreground">
            {next.length ? (
              <>
                Next scheduled search: {next[0]}.{" "}
                <Link href="/?tab=schedule" className="underline underline-offset-2">
                  Change the schedule
                </Link>
              </>
            ) : (
              <>
                Scheduled searches are off.{" "}
                <Link href="/?tab=schedule" className="underline underline-offset-2">
                  Turn them on
                </Link>
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <RunNowButton kind="fetch" disabled={!hasKey || busy("fetch")} />
          <RunNowButton kind="apply" variant="outline" disabled={!hasKey || busy("apply") || approvedCount === 0} />
        </div>
      </section>

      <section aria-label="Agents" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {summaries.map((a) => (
          <article key={a.id} className="flex flex-col rounded-xl border p-4">
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
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{a.role}</p>
            <dl className="mt-4 grid grid-cols-3 gap-2">
              {a.stats.map((s) => (
                <div key={s.label}>
                  <dt className="text-[11px] leading-tight text-muted-foreground">{s.label}</dt>
                  <dd className="mt-0.5 text-lg font-semibold tabular-nums">{s.value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 flex-1 border-t pt-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Latest work</p>
              {a.recent.length ? (
                <ul className="mt-2 space-y-2">
                  {a.recent.map((r, i) => (
                    <li key={`${r.jobId}-${i}`} className="text-xs">
                      <span className="font-medium">{r.job}</span>
                      <span className="text-muted-foreground">: {r.note}</span>
                      <span className="block text-[11px] text-muted-foreground">{at(r.at, timezone)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">Nothing yet. It starts with the next job search.</p>
              )}
            </div>
          </article>
        ))}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Agent runs</h3>
        {recent.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            Runs you start here or that the schedule starts show up in this list, with a link to watch each one.
          </div>
        ) : (
          <ul className="divide-y rounded-xl border">
            {recent.slice(0, 20).map((l) => {
              const info = l.runId ? infos.get(l.runId) : undefined;
              const status = launchStatus(l, info);
              return (
                <li key={`${l.at}-${l.kind}`} className="flex flex-col gap-2 p-4 text-sm sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{KIND_LABEL[l.kind]}</span>
                      <StatusBadge {...status} />
                      <span className="text-xs text-muted-foreground">
                        {at(l.at, timezone)}, {l.trigger === "schedule" ? "scheduled" : "started by you"}
                        {l.model ? `, ${modelLabel(l.model)}` : ""}
                        {info?.durationMs ? `, took ${took(info.durationMs)}` : ""}
                      </span>
                    </div>
                    {l.error && <p className="text-xs text-muted-foreground">{l.error}</p>}
                    {info?.result && (
                      <details className="text-xs text-muted-foreground">
                        <summary className="cursor-pointer select-none">What it did</summary>
                        <p className="mt-1 whitespace-pre-wrap">{info.result}</p>
                      </details>
                    )}
                  </div>
                  {l.url && (
                    <Button size="sm" variant="ghost" render={<a href={l.url} target="_blank" rel="noreferrer" />} nativeButton={false}>
                      Open in Cursor
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
