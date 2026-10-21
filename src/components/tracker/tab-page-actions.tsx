"use client";

import { Suspense } from "react";
import type { DeskTab } from "./dashboard-layout";
import { DashboardSearch } from "./dashboard-search";
import { ViewModeToggle } from "./view-mode";

const VIEW_TABS: DeskTab[] = ["today", "applications", "resumes", "outreach", "ignored"];

export function TabPageActions({ tab }: { tab: DeskTab }) {
  const showView = VIEW_TABS.includes(tab);
  const showSearch = VIEW_TABS.includes(tab);

  if (!showSearch && !showView) return null;

  return (
    <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
      {showSearch && (
        <Suspense fallback={<div className="h-9 w-full min-w-[12rem] rounded-md bg-muted sm:w-52" aria-hidden />}>
          <DashboardSearch variant="compact" className="w-full sm:w-52" />
        </Suspense>
      )}
      {showView && <ViewModeToggle />}
    </div>
  );
}
