"use client";

import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto w-full max-w-xl px-4 py-16">
      <div className="rounded-xl border p-6">
        <p className="font-medium">The tracker could not be read.</p>
        <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
        <p className="mt-3 text-sm text-muted-foreground">Check that data/tracker.json is valid JSON, then try again.</p>
        <Button className="mt-4" variant="outline" onClick={reset}>
          Try again
        </Button>
      </div>
    </main>
  );
}
