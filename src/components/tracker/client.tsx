"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ButtonProps = React.ComponentProps<typeof Button>;

export function SubmitButton({ children, pendingLabel = "Saving...", ...props }: ButtonProps & { pendingLabel?: string }) {
  const { pending, data } = useFormStatus();
  const mine = pending && (props.name === undefined || data?.get(props.name as string) === props.value);
  return (
    <Button type="submit" disabled={pending} aria-busy={mine || undefined} {...props}>
      {mine ? pendingLabel : children}
    </Button>
  );
}

/** Reloads server data while a cloud run is going, so its status updates without a manual refresh. */
export function AutoRefresh({ every = 20 }: { every?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), every * 1000);
    return () => clearInterval(id);
  }, [router, every]);
  return null;
}

export function TimesField({ initial, max }: { initial: string[]; max: number }) {
  const [times, setTimes] = useState(initial.length ? initial : ["08:00"]);
  return (
    <div className="space-y-2">
      {times.map((t, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            type="time"
            name="time"
            value={t}
            required
            aria-label={`Run time ${i + 1}`}
            className="w-36"
            onChange={(e) => setTimes(times.map((x, j) => (j === i ? e.target.value : x)))}
          />
          {times.length > 1 && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setTimes(times.filter((_, j) => j !== i))}>
              Remove
            </Button>
          )}
        </div>
      ))}
      {times.length < max && (
        <Button type="button" variant="outline" size="sm" onClick={() => setTimes([...times, "16:00"])}>
          Add a time
        </Button>
      )}
    </div>
  );
}

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      size="xs"
      variant="outline"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? "Copied" : label}
    </Button>
  );
}
