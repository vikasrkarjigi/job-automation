"use client";

import { useEffect, useMemo, useState } from "react";
import { saveAgentGuide } from "@/app/actions";
import type { AgentDocId } from "@/agent-docs-catalog";
import { AGENT_DOC_CATALOG } from "@/agent-docs-catalog";
import { cn } from "@/lib/utils";
import { ContentCard } from "./design";
import { SubmitButton } from "./client";

export function AgentGuides({ initial, back }: { initial: Record<AgentDocId, string>; back: string }) {
  const [selected, setSelected] = useState<AgentDocId>("orchestrator");
  const meta = useMemo(() => AGENT_DOC_CATALOG.find((d) => d.id === selected)!, [selected]);
  const saved = initial[selected] ?? "";
  const [draft, setDraft] = useState(saved);

  useEffect(() => {
    setDraft(saved);
  }, [selected, saved]);

  function pick(id: AgentDocId) {
    setSelected(id);
    setDraft(initial[id] ?? "");
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(11rem,14rem)_1fr]">
      <ContentCard className="h-fit p-2">
        <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Agent files</p>
        <ul className="space-y-0.5">
          {AGENT_DOC_CATALOG.map(({ id, label }) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => pick(id)}
                className={cn(
                  "w-full rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                  selected === id ? "bg-primary/10 font-medium text-primary" : "text-foreground hover:bg-muted",
                )}
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
      </ContentCard>

      <form action={saveAgentGuide} className="flex min-h-[32rem] flex-col gap-3">
        <input type="hidden" name="back" value={back} />
        <input type="hidden" name="docId" value={selected} />
        <div>
          <p className="font-medium">{meta.label}</p>
          <p className="text-sm text-muted-foreground">
            {meta.hint} Saved to <code className="text-xs">agents/{meta.file}</code> on GitHub — cloud agents read this on their next run.
          </p>
        </div>
        <textarea
          name="content"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          spellCheck
          className="min-h-[28rem] flex-1 resize-y rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm leading-relaxed shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton pendingLabel="Saving…">Save guide</SubmitButton>
          <p className="text-xs text-muted-foreground">Use Markdown. Do not remove safety rules (no Submit, no unsent email) unless you accept the risk.</p>
        </div>
      </form>
    </div>
  );
}
