"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { DeskTab } from "./dashboard-layout";

function tabFromParams(tabParam: string | null): DeskTab {
  const allowed: DeskTab[] = ["today", "find", "applications", "outreach", "resumes", "ignored", "answers", "agents", "models", "schedule", "runs"];
  const t = tabParam ?? "today";
  return (allowed.includes(t as DeskTab) ? t : "today") as DeskTab;
}

export function DashboardSearch({ variant }: { variant: "sidebar" | "mobile" }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const currentQ = sp.get("q") ?? "";
  const [value, setValue] = useState(currentQ);

  useEffect(() => {
    setValue(currentQ);
  }, [currentQ]);

  const commit = useCallback(
    (next: string) => {
      const tab = tabFromParams(sp.get("tab"));
      const params = new URLSearchParams(sp.toString());
      const trimmed = next.trim();
      if (trimmed) params.set("q", trimmed);
      else params.delete("q");
      if (tab === "today") params.delete("tab");
      else params.set("tab", tab);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, sp],
  );

  useEffect(() => {
    const t = setTimeout(() => {
      if (value.trim() !== currentQ.trim()) commit(value);
    }, 280);
    return () => clearTimeout(t);
  }, [value, currentQ, commit]);

  return (
    <div className={cn("px-2", variant === "sidebar" ? "pb-2 pt-1" : "pb-3 pt-0")}>
      <label className="sr-only" htmlFor={`search-${variant}`}>
        Search jobs and resumes
      </label>
      <Input
        id={`search-${variant}`}
        type="search"
        placeholder="Search title, company, city…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={cn(
          "h-9 text-sm",
          variant === "sidebar" && "border-sidebar-border bg-sidebar-accent/20 text-sidebar-foreground placeholder:text-sidebar-foreground/45",
        )}
      />
      {currentQ && (
        <button
          type="button"
          className={cn("mt-1.5 text-[11px] underline-offset-2 hover:underline", variant === "sidebar" ? "text-sidebar-foreground/70" : "text-muted-foreground")}
          onClick={() => {
            setValue("");
            commit("");
          }}
        >
          Clear search
        </button>
      )}
    </div>
  );
}

export function SearchHint({ query, total, shown }: { query: string | undefined; total: number; shown: number }) {
  if (!query?.trim()) return null;
  return (
    <p className="mb-4 text-sm text-muted-foreground">
      Showing <span className="font-medium text-foreground">{shown}</span> of {total} matching &ldquo;{query.trim()}&rdquo;
      {shown === 0 && " — try company name, city, or part of the job title."}
    </p>
  );
}
