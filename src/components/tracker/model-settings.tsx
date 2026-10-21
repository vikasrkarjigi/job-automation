"use client";

import { useState } from "react";
import { saveAgentModels } from "@/app/actions";
import { MODEL_CATALOG, catalogEntry } from "@/model-catalog";
import { SubmitButton } from "./client";

export function ModelSettings({ initial, back }: { initial: { models: string[]; fallback: boolean }; back: string }) {
  const [selected, setSelected] = useState<string[]>(initial.models);
  const [fallback, setFallback] = useState(initial.fallback);

  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const move = (id: string, dir: -1 | 1) => {
    setSelected((prev) => {
      const i = prev.indexOf(id);
      if (i < 0) return prev;
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j]!, next[i]!];
      return next;
    });
  };

  const promote = (id: string) => {
    setSelected((prev) => [id, ...prev.filter((x) => x !== id)]);
  };

  return (
    <form action={saveAgentModels} className="glass-panel space-y-5 p-5 sm:p-6">
      <input type="hidden" name="back" value={back} />
      <input type="hidden" name="fallback" value={fallback ? "1" : "0"} />
      {selected.map((id) => (
        <input key={id} type="hidden" name="model" value={id} />
      ))}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-semibold tracking-tight text-foreground">Cloud agent models</h3>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Pick which Cursor models to use for Find jobs now and scheduled searches. Order matters: we try the first, then the next if the previous is limited or busy.
          </p>
        </div>
        <label className="flex cursor-pointer items-center gap-2 rounded-full border border-border/80 bg-background/60 px-3 py-1.5 text-sm shadow-sm backdrop-blur">
          <input
            type="checkbox"
            className="size-4 accent-[var(--brand)]"
            checked={fallback}
            onChange={(e) => setFallback(e.target.checked)}
          />
          <span>Try fallbacks</span>
        </label>
      </div>

      {!fallback && selected.length > 1 && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-950 dark:text-amber-100">
          Fallbacks are off. Only <strong>{catalogEntry(selected[0]!).label}</strong> will be used until you turn fallbacks back on.
        </p>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        {MODEL_CATALOG.map((m) => {
          const on = selected.includes(m.id);
          const order = selected.indexOf(m.id);
          return (
            <div
              key={m.id}
              className={`group relative overflow-hidden rounded-xl border transition-all duration-200 ${on ? "border-[var(--brand)]/40 bg-gradient-to-br shadow-md shadow-indigo-500/10 " + m.accent : "border-border/60 bg-card/40 hover:border-border hover:bg-card/80"}`}
            >
              <button type="button" onClick={() => toggle(m.id)} className="flex w-full flex-col items-start gap-1 p-4 text-left">
                <div className="flex w-full items-center justify-between gap-2">
                  <span className="font-medium">{m.label}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${on ? "bg-[var(--brand)] text-white" : "bg-muted text-muted-foreground"}`}
                  >
                    {on ? (order === 0 ? "Primary" : `#${order + 1}`) : "Off"}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">{m.hint}</span>
                <code className="mt-1 text-[10px] text-muted-foreground/80">{m.id}</code>
              </button>
              {on && (
                <div className="flex gap-1 border-t border-border/50 bg-background/40 px-2 py-1.5">
                  <button type="button" className="rounded-md px-2 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => promote(m.id)}>
                    Make primary
                  </button>
                  <button type="button" disabled={order <= 0} className="rounded-md px-2 py-0.5 text-xs disabled:opacity-30" onClick={() => move(m.id, -1)}>
                    Up
                  </button>
                  <button type="button" disabled={order < 0 || order >= selected.length - 1} className="rounded-md px-2 py-0.5 text-xs disabled:opacity-30" onClick={() => move(m.id, 1)}>
                    Down
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selected.length === 0 && <p className="text-sm text-destructive">Turn on at least one model.</p>}

      <div className="flex flex-wrap items-center gap-3 border-t border-border/60 pt-4">
        <SubmitButton disabled={selected.length === 0}>Save model preferences</SubmitButton>
        <p className="text-xs text-muted-foreground">Saved to GitHub with your other pipeline settings. Next Find jobs now uses this order.</p>
      </div>
    </form>
  );
}
