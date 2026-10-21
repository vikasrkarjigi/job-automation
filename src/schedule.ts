import fs from "node:fs";
import path from "node:path";
import { paths } from "./settings.ts";

export type RunKind = "fetch" | "apply";

export interface Schedule {
  enabled: boolean;
  timezone: string;
  /** "HH:MM" in `timezone`, sorted. */
  times: string[];
  /** 0 is Sunday. */
  days: number[];
}

export interface Launch {
  kind: RunKind;
  trigger: "you" | "schedule";
  /** "YYYY-MM-DD HH:MM" in the schedule's time zone, for scheduled runs. */
  slot: string | null;
  at: string;
  agentId: string | null;
  runId: string | null;
  url: string | null;
  error: string | null;
}

export const DEFAULT_SCHEDULE: Schedule = {
  enabled: true,
  timezone: "America/Los_Angeles",
  times: ["04:00", "12:00", "20:00"],
  days: [0, 1, 2, 3, 4, 5, 6],
};

/** GitHub Actions checks every 30 minutes and is sometimes late, so a slot stays due for an hour. */
export const SLOT_WINDOW_MINUTES = 60;
export const MAX_TIMES = 6;
const KEEP_LAUNCHES = 60;

const schedulePath = () => path.join(paths.data(), "schedule.json");
const launchesPath = () => path.join(paths.data(), "agent-runs.json");

export function validTime(t: string): boolean {
  const m = /^(\d{2}):(\d{2})$/.exec(t);
  return !!m && Number(m[1]) < 24 && Number(m[2]) < 60;
}

export function validTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function cleanSchedule(s: Partial<Schedule>): Schedule {
  const times = [...new Set((s.times ?? []).map((t) => t.trim()).filter(validTime))].sort().slice(0, MAX_TIMES);
  const days = [...new Set((s.days ?? []).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort();
  return {
    enabled: s.enabled ?? DEFAULT_SCHEDULE.enabled,
    timezone: s.timezone && validTimezone(s.timezone) ? s.timezone : DEFAULT_SCHEDULE.timezone,
    times,
    days,
  };
}

export function loadSchedule(): Schedule {
  if (!fs.existsSync(schedulePath())) return { ...DEFAULT_SCHEDULE };
  return cleanSchedule(JSON.parse(fs.readFileSync(schedulePath(), "utf8")));
}

export function saveSchedule(s: Schedule): Schedule {
  const clean = cleanSchedule(s);
  fs.mkdirSync(paths.data(), { recursive: true });
  fs.writeFileSync(schedulePath(), JSON.stringify(clean, null, 2) + "\n");
  return clean;
}

export function loadLaunches(): Launch[] {
  if (!fs.existsSync(launchesPath())) return [];
  return JSON.parse(fs.readFileSync(launchesPath(), "utf8"));
}

export function saveLaunches(list: Launch[]): void {
  fs.mkdirSync(paths.data(), { recursive: true });
  fs.writeFileSync(launchesPath(), JSON.stringify(list.slice(-KEEP_LAUNCHES), null, 2) + "\n");
}

interface LocalTime {
  date: string;
  weekday: number;
  /** Wall-clock time in the zone, as if it were UTC. Only differences between these are meaningful. */
  naive: number;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function local(at: Date, timezone: string): LocalTime {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      weekday: "short",
      hourCycle: "h23",
    })
      .formatToParts(at)
      .map((p) => [p.type, p.value]),
  );
  const [y, m, d, h, min] = [parts.year, parts.month, parts.day, parts.hour, parts.minute].map(Number);
  return { date: `${parts.year}-${parts.month}-${parts.day}`, weekday: WEEKDAYS.indexOf(parts.weekday), naive: Date.UTC(y, m - 1, d, h, min) };
}

function slotsAround(s: Schedule, now: Date, daysBack: number, daysAhead: number) {
  const here = local(now, s.timezone);
  const out: { key: string; minutesFromNow: number; weekday: number }[] = [];
  const [y, m, d] = here.date.split("-").map(Number);
  for (let offset = -daysBack; offset <= daysAhead; offset++) {
    const day = new Date(Date.UTC(y, m - 1, d + offset));
    const weekday = day.getUTCDay();
    if (!s.days.includes(weekday)) continue;
    const date = day.toISOString().slice(0, 10);
    for (const t of s.times) {
      const [h, m] = t.split(":").map(Number);
      const naive = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), h, m);
      out.push({ key: `${date} ${t}`, minutesFromNow: Math.round((naive - here.naive) / 60_000), weekday });
    }
  }
  return out.sort((a, b) => a.minutesFromNow - b.minutesFromNow);
}

/** The scheduled slot that should start now, if any. Each slot starts at most once. */
export function dueSlot(s: Schedule, now: Date, launches: Launch[]): string | null {
  if (!s.enabled) return null;
  const started = new Set(launches.map((l) => l.slot).filter(Boolean));
  const due = slotsAround(s, now, 1, 0).filter((x) => x.minutesFromNow <= 0 && x.minutesFromNow > -SLOT_WINDOW_MINUTES && !started.has(x.key));
  return due.length ? due[due.length - 1].key : null;
}

export function upcoming(s: Schedule, now: Date, count = 4): string[] {
  if (!s.enabled) return [];
  return slotsAround(s, now, 0, 8)
    .filter((x) => x.minutesFromNow > 0)
    .slice(0, count)
    .map((x) => {
      const [date, time] = x.key.split(" ");
      const [y, m, d] = date.split("-").map(Number);
      const monthDay = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
      return `${WEEKDAYS[x.weekday]} ${monthDay}, ${clock(time)}`;
    });
}

export function clock(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const suffix = h < 12 ? "am" : "pm";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m ? `${hour}:${String(m).padStart(2, "0")} ${suffix}` : `${hour} ${suffix}`;
}

export function describeSchedule(s: Schedule): string {
  if (!s.enabled || !s.times.length || !s.days.length) return "Scheduled runs are off";
  const times = s.times.map(clock);
  const list = times.length > 1 ? `${times.slice(0, -1).join(", ")} and ${times.at(-1)}` : times[0];
  const days = s.days.length === 7 ? "every day" : s.days.join() === "1,2,3,4,5" ? "on weekdays" : `on ${s.days.map((d) => WEEKDAYS[d]).join(", ")}`;
  return `${list} ${days}`;
}
