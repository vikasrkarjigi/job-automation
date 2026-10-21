"use client";

import { useState } from "react";
import type { JobRow } from "@/types";
import { KeywordChips } from "./bits";

export function CollapsibleKeywordChips({ job, limit = 5 }: { job: JobRow; limit?: number }) {
  const [open, setOpen] = useState(false);
  const count = job.analysis?.keywords.length ?? 0;
  if (!count) return null;

  return (
    <div className="space-y-2">
      <div className={open ? undefined : "max-h-[4.5rem] overflow-hidden"}>
        <KeywordChips job={job} />
      </div>
      {count > limit && (
        <button type="button" className="text-xs font-medium text-primary underline-offset-2 hover:underline" onClick={() => setOpen((v) => !v)}>
          {open ? "Show fewer keywords" : `+ ${count - limit} more keywords…`}
        </button>
      )}
    </div>
  );
}
