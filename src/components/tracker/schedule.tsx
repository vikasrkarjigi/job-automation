import { updateSchedule } from "@/app/actions";
import { describeSchedule, MAX_TIMES, type Schedule } from "@/schedule";
import { SubmitButton, TimesField } from "./client";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const ZONES: [string, string][] = [
  ["America/Los_Angeles", "Pacific (San Francisco)"],
  ["America/Denver", "Mountain (Denver)"],
  ["America/Chicago", "Central (Chicago)"],
  ["America/New_York", "Eastern (New York)"],
  ["Asia/Kolkata", "India (Bengaluru)"],
  ["Europe/London", "London"],
  ["UTC", "UTC"],
];

export function ScheduleForm({ schedule, next, hasKey, back }: { schedule: Schedule; next: string[]; hasKey: boolean; back: string }) {
  const zones = ZONES.some(([z]) => z === schedule.timezone) ? ZONES : [[schedule.timezone, schedule.timezone] as [string, string], ...ZONES];
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
      <form action={updateSchedule} className="space-y-6 rounded-xl border p-5">
        <input type="hidden" name="back" value={back} />
        <div>
          <h3 className="font-semibold">When to search for jobs</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Each search runs the scout, the ATS scorer, and the resume tailor in a Cursor cloud agent, then the new jobs show up on Today. You can also press Find jobs now at any time.
          </p>
        </div>

        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="enabled" defaultChecked={schedule.enabled} className="size-4 accent-foreground" />
          <span className="font-medium">Run job searches on this schedule</span>
        </label>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Times</legend>
          <TimesField initial={schedule.times} max={MAX_TIMES} />
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Days</legend>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((d, i) => (
              <label key={d} className="cursor-pointer">
                <input type="checkbox" name="day" value={i} defaultChecked={schedule.days.includes(i)} className="peer sr-only" />
                <span className="inline-flex h-8 min-w-12 items-center justify-center rounded-md border px-3 text-sm text-muted-foreground transition-colors peer-checked:border-foreground peer-checked:bg-foreground peer-checked:text-background peer-focus-visible:ring-2 peer-focus-visible:ring-ring">
                  {d}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="block space-y-2 text-sm">
          <span className="font-medium">Time zone</span>
          <select name="timezone" defaultValue={schedule.timezone} className="block h-9 w-full max-w-xs rounded-md border bg-background px-2 text-sm">
            {zones.map(([z, label]) => (
              <option key={z} value={z}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <SubmitButton>Save schedule</SubmitButton>
      </form>

      <aside className="space-y-4 text-sm">
        <div className="rounded-xl border p-4">
          <p className="font-medium">Right now</p>
          <p className="mt-1 text-muted-foreground">{describeSchedule(schedule)}.</p>
          {next.length > 0 && (
            <>
              <p className="mt-3 font-medium">Next searches</p>
              <ul className="mt-1 space-y-0.5 text-muted-foreground">
                {next.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </>
          )}
        </div>
        <div className="rounded-xl border p-4 text-muted-foreground">
          <p className="font-medium text-foreground">How it runs</p>
          <p className="mt-1">
            On Vercel Pro, a cron can check this every 30 minutes. On the free Hobby plan, use Find jobs now or your Cursor Automation at 4 am, 12 pm, and 8 pm Pacific until you upgrade or add a deploy hook.
          </p>
          {!hasKey && <p className="mt-2 text-amber-700 dark:text-amber-400">Add CURSOR_API_KEY in Vercel first, or nothing will start.</p>}
        </div>
      </aside>
    </div>
  );
}
