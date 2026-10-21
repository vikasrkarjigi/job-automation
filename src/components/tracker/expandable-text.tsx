"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function ExpandableText({
  text,
  max = 88,
  className,
}: {
  text: string;
  max?: number;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const trimmed = text.trim();
  if (!trimmed) return null;
  const long = trimmed.length > max;
  const shown = open || !long ? trimmed : `${trimmed.slice(0, max).trim()}…`;

  return (
    <p className={cn("text-sm leading-snug text-muted-foreground", className)}>
      {shown}
      {long && (
        <button
          type="button"
          className="ml-1 font-medium text-primary underline-offset-2 hover:underline"
          onClick={(e) => {
            e.stopPropagation();
            setOpen((v) => !v);
          }}
        >
          {open ? "Less" : "See more"}
        </button>
      )}
    </p>
  );
}
