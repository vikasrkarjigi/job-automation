"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { DeskTab } from "./dashboard-layout";

function tabFromParams(tabParam: string | null): DeskTab {
  const allowed: DeskTab[] = ["today", "find", "applications", "outreach", "resumes", "ignored", "answers", "agents", "guides", "models", "schedule", "runs"];
  const t = tabParam ?? "today";
  return (allowed.includes(t as DeskTab) ? t : "today") as DeskTab;
}

export function DashboardSearch({ variant, className }: { variant: "compact"; className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const currentQ = sp.get("q") ?? "";
  const [mounted, setMounted] = useState(false);
  const [value, setValue] = useState("");

  useEffect(() => {
    setMounted(true);
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
    if (!mounted) return;
    const t = setTimeout(() => {
      if (value.trim() !== currentQ.trim()) commit(value);
    }, 280);
    return () => clearTimeout(t);
  }, [value, currentQ, commit, mounted]);

  if (!mounted) {
    return <div className="h-9 w-44 shrink-0 rounded-md bg-muted sm:w-52" aria-hidden />;
  }

  return (
    <div className={cn("relative min-w-[11rem] shrink-0", className)}>
      <label className="sr-only" htmlFor="dashboard-search">
        Search jobs and resumes
      </label>
      <Input
        id="dashboard-search"
        type="search"
        placeholder="Search…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={cn("h-9 pr-8 text-sm")}
      />
      {currentQ && (
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-medium text-muted-foreground hover:text-foreground"
          onClick={() => {
            setValue("");
            commit("");
          }}
        >
          Clear
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
