"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

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
