"use client";

import { useState } from "react";
import type { SearchCriteria } from "@/search-criteria.defaults";
import { DEFAULT_TITLES } from "@/search-criteria.defaults";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ContentCard, SectionLabel } from "./design";
import { SubmitButton } from "./client";

type Panel = "filters" | "plain";

export function FindJobsForm({
  initial,
  back,
  hasKey,
  action,
}: {
  initial: SearchCriteria;
  back: string;
  hasKey: boolean;
  action: (form: FormData) => void | Promise<void>;
}) {
  const [panel, setPanel] = useState<Panel>("filters");
  const titlesValue = initial.titles.length ? initial.titles.join("\n") : DEFAULT_TITLES.join("\n");

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="back" value={back} />

      <div className="flex flex-wrap gap-2">
        {(["filters", "plain"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setPanel(key)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition-colors",
              panel === key ? "bg-primary text-primary-foreground ring-2 ring-primary/30" : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            {key === "filters" ? "Filters" : "Plain English"}
          </button>
        ))}
      </div>

      <ContentCard className="space-y-6 p-5 sm:p-6">
        <div className={cn(panel !== "filters" && "hidden")} aria-hidden={panel !== "filters"}>
          <div>
            <SectionLabel>Job titles</SectionLabel>
            <p className="mb-2 text-sm text-muted-foreground">One per line. These are searched on Indeed, LinkedIn, and Jobright.</p>
            <textarea
              name="titles"
              rows={6}
              defaultValue={titlesValue}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label htmlFor="batchSize" className="text-sm font-medium">
                How many jobs to keep
              </label>
              <Input id="batchSize" name="batchSize" type="number" min={1} max={50} defaultValue={initial.batchSize} className="mt-1.5" />
            </div>
            <div>
              <label htmlFor="maxYears" className="text-sm font-medium">
                Max years of experience
              </label>
              <Input id="maxYears" name="maxYears" type="number" min={0} max={20} defaultValue={initial.maxYears} className="mt-1.5" />
            </div>
            <div>
              <label htmlFor="visa" className="text-sm font-medium">
                Visa sponsorship
              </label>
              <select id="visa" name="visa" defaultValue={initial.visa} className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
                <option value="any">Drop only if they refuse sponsorship</option>
                <option value="must_sponsor">Must explicitly offer sponsorship</option>
              </select>
            </div>
          </div>

          <div className="mt-6">
            <SectionLabel>Salary range (optional, USD)</SectionLabel>
            <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:max-w-lg">
              <div>
                <label htmlFor="salaryMin" className="text-sm font-medium">
                  Minimum
                </label>
                <Input id="salaryMin" name="salaryMin" type="number" min={0} step={1000} placeholder="120000" defaultValue={initial.salaryMin ?? ""} className="mt-1.5" />
              </div>
              <div>
                <label htmlFor="salaryMax" className="text-sm font-medium">
                  Maximum
                </label>
                <Input id="salaryMax" name="salaryMax" type="number" min={0} step={1000} placeholder="180000" defaultValue={initial.salaryMax ?? ""} className="mt-1.5" />
              </div>
            </div>
          </div>

          <div className="mt-6">
            <SectionLabel>Location (optional)</SectionLabel>
            <div className="mt-2 grid gap-3 sm:grid-cols-3">
              <div>
                <label htmlFor="city" className="text-sm font-medium">
                  City
                </label>
                <Input id="city" name="city" defaultValue={initial.city} placeholder="San Francisco" className="mt-1.5" />
              </div>
              <div>
                <label htmlFor="state" className="text-sm font-medium">
                  State / region
                </label>
                <Input id="state" name="state" defaultValue={initial.state} placeholder="CA" className="mt-1.5" />
              </div>
              <div>
                <label htmlFor="country" className="text-sm font-medium">
                  Country
                </label>
                <Input id="country" name="country" defaultValue={initial.country} placeholder="United States" className="mt-1.5" />
              </div>
            </div>
          </div>
        </div>

        {panel === "plain" ? (
          <div>
            <SectionLabel>Describe what you want</SectionLabel>
            <p className="mb-2 text-sm text-muted-foreground">
              Write in everyday language. The agent uses this together with any filters you set on the Filters tab.
            </p>
            <textarea
              name="plainEnglish"
              rows={10}
              defaultValue={initial.plainEnglish}
              placeholder="Example: Entry-level AI engineer in the Bay Area, remote OK, must sponsor H-1B, $140k+, no staffing firms."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4">
            <p className="text-sm font-medium">Optional plain-English note</p>
            <textarea
              name="plainEnglish"
              rows={3}
              defaultValue={initial.plainEnglish}
              placeholder="Optional short note for the agent…"
              className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        )}
      </ContentCard>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton disabled={!hasKey} pendingLabel="Starting search…">
          Run job search
        </SubmitButton>
        {!hasKey && <p className="text-sm text-muted-foreground">Add CURSOR_API_KEY in Vercel to start a cloud search.</p>}
      </div>
    </form>
  );
}
