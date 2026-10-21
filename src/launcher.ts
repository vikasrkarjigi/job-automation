import { ACTIVE, runInfo, startRun } from "./cloud.ts";
import { dueSlot, loadLaunches, loadSchedule, saveLaunches, type Launch, type RunKind } from "./schedule.ts";
import { readState, writeState } from "./store.ts";

const LABEL: Record<RunKind, string> = { fetch: "job search", apply: "application run" };

async function activeRun(kind: RunKind, launches: Launch[], now: Date): Promise<Launch | null> {
  const last = launches.filter((l) => l.kind === kind && l.runId).at(-1);
  if (!last || now.getTime() - Date.parse(last.at) > 6 * 3_600_000) return null;
  try {
    return ACTIVE.includes((await runInfo(last.agentId!, last.runId!)).status) ? last : null;
  } catch {
    return null;
  }
}

async function record(entry: Launch, message: string): Promise<void> {
  await writeState(message, () => {
    const list = loadLaunches();
    const i = list.findIndex((l) => l.at === entry.at && l.kind === entry.kind);
    if (i >= 0) list[i] = entry;
    else list.push(entry);
    saveLaunches(list);
  });
}

/** Starts a cloud agent now. Refuses while the same kind of run is still going. */
export async function runNow(kind: RunKind, now = new Date()): Promise<Launch> {
  const launches = await readState(loadLaunches);
  const busy = await activeRun(kind, launches, now);
  if (busy) throw new Error(`A ${LABEL[kind]} is already running. It started ${new Date(busy.at).toLocaleTimeString("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", minute: "2-digit" })} Pacific`);
  const started = await startRun(kind);
  const entry: Launch = { kind, trigger: "you", slot: null, at: now.toISOString(), ...started, error: null };
  await record(entry, `Started a ${LABEL[kind]}`);
  return entry;
}

export type TickResult = { started: false; reason: string } | { started: true; slot: string; url: string | null };

/**
 * Called every 30 minutes by GitHub Actions. The slot is claimed in the repository before the agent
 * starts, so overlapping or repeated calls start each scheduled run once.
 */
export async function tick(now = new Date()): Promise<TickResult> {
  const { schedule, launches } = await readState(() => ({ schedule: loadSchedule(), launches: loadLaunches() }));
  if (!dueSlot(schedule, now, launches)) return { started: false, reason: schedule.enabled ? "nothing due" : "schedule is off" };

  const entry = await writeState("Claimed a scheduled job search", () => {
    const list = loadLaunches();
    const slot = dueSlot(loadSchedule(), now, list);
    if (!slot) return null;
    const claimed: Launch = { kind: "fetch", trigger: "schedule", slot, at: now.toISOString(), agentId: null, runId: null, url: null, error: null };
    saveLaunches([...list, claimed]);
    return claimed;
  });
  if (!entry) return { started: false, reason: "already claimed" };

  const busy = await activeRun("fetch", launches, now);
  if (busy) {
    await record({ ...entry, error: "Skipped because the previous job search was still running" }, "Skipped a scheduled job search");
    return { started: false, reason: "previous run still going" };
  }
  try {
    const started = await startRun("fetch");
    await record({ ...entry, ...started }, `Started the ${entry.slot} job search`);
    return { started: true, slot: entry.slot!, url: started.url };
  } catch (err) {
    await record({ ...entry, error: err instanceof Error ? err.message : String(err) }, "Scheduled job search failed to start");
    throw err;
  }
}
