"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { href, NAV } from "./dashboard-layout";

/** Warm tab routes so sidebar / mobile switches feel instant. */
export function NavPrefetch() {
  const router = useRouter();
  useEffect(() => {
    for (const { tab } of NAV) {
      router.prefetch(href(tab));
    }
  }, [router]);
  return null;
}
