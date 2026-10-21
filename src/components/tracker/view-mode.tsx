"use client";

import { useCallback, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

export type JobViewMode = "cards" | "rows";

const KEY = "job-automation-view";

function getMode(): JobViewMode {
  if (typeof window === "undefined") return "cards";
  return localStorage.getItem(KEY) === "rows" ? "rows" : "cards";
}

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener("job-view-mode", cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener("job-view-mode", cb);
  };
}

export function useJobViewMode(): [JobViewMode, (mode: JobViewMode) => void] {
  const mode = useSyncExternalStore(subscribe, getMode, () => "cards" as JobViewMode);
  const setMode = useCallback((next: JobViewMode) => {
    localStorage.setItem(KEY, next);
    window.dispatchEvent(new Event("job-view-mode"));
  }, []);
  return [mode, setMode];
}

export function ViewModeToggle({ className }: { className?: string }) {
  const [mode, setMode] = useJobViewMode();
  return (
    <div className={cn("inline-flex rounded-lg border border-border p-0.5 text-xs", className)} role="group" aria-label="Layout">
      <button
        type="button"
        onClick={() => setMode("rows")}
        className={cn("rounded-md px-2.5 py-1.5 font-medium transition-colors", mode === "rows" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}
      >
        Rows
      </button>
      <button
        type="button"
        onClick={() => setMode("cards")}
        className={cn("rounded-md px-2.5 py-1.5 font-medium transition-colors", mode === "cards" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}
      >
        Cards
      </button>
    </div>
  );
}
