export const DEFAULT_TZ = "America/Chicago";
export const DEFAULT_HOURS = [4, 12, 20];

export function runHours(): number[] {
  const raw = process.env.SHORTLIST_RUN_HOURS?.trim();
  if (!raw) return DEFAULT_HOURS;
  return raw
    .split(",")
    .map((h) => Number(h.trim()))
    .filter((h) => Number.isInteger(h) && h >= 0 && h <= 23);
}

export function localTime(now: Date, tz = process.env.SHORTLIST_TZ || DEFAULT_TZ) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return { tz, hour: Number(parts.hour), day: `${parts.year}-${parts.month}-${parts.day}` };
}

export function slotLabel(hour: number): string {
  if (hour === 0) return "12 am";
  if (hour === 12) return "12 pm";
  return hour < 12 ? `${hour} am` : `${hour - 12} pm`;
}

/** Returns the slot to run now, or null. Each slot runs at most once per local day. */
export function dueSlot(now: Date): { key: string; label: string; tz: string } | null {
  const t = localTime(now);
  if (!runHours().includes(t.hour)) return null;
  return { key: `${t.day}@${t.hour}`, label: slotLabel(t.hour), tz: t.tz };
}
