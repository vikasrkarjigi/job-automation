"use client";

import { useState } from "react";
import type { DeskTab } from "./dashboard-layout";
import { href, NAV } from "./dashboard-layout";
import { NavLink } from "./nav-link";

const DOCK: DeskTab[] = ["today", "applications", "agents", "models", "answers"];

export function MobileDock({ tab, navBadges }: { tab: DeskTab; navBadges: Partial<Record<DeskTab, string>> }) {
  const [more, setMore] = useState(false);
  const moreItems = NAV.filter((n) => !DOCK.includes(n.tab));

  return (
    <>
      <div className="h-[4.5rem] shrink-0 lg:hidden" aria-hidden />
      <nav
        aria-label="Mobile"
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-background/95 px-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur-md lg:hidden"
      >
        {NAV.filter((n) => DOCK.includes(n.tab)).map(({ tab: t, label, icon }) => (
          <NavLink key={t} tab={t} href={href(t)} icon={icon} badge={navBadges[t]} variant="bottom">
            {label.split(" ")[0]}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={() => setMore(true)}
          className={`flex min-w-[3.5rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-2 text-[10px] font-medium ${more ? "text-primary" : "text-muted-foreground"}`}
        >
          <span className="text-lg leading-none">⋯</span>
          More
        </button>
      </nav>

      {more && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal aria-label="More sections">
          <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close" onClick={() => setMore(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[70vh] overflow-y-auto rounded-t-2xl border-t border-border bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl">
            <p className="mb-3 text-sm font-semibold">All sections</p>
            <div className="grid gap-1">
              {NAV.map(({ tab: t, label, icon }) => (
                <NavLink
                  key={t}
                  tab={t}
                  href={href(t)}
                  icon={icon}
                  badge={navBadges[t]}
                  variant="menu"
                  onNavigate={() => setMore(false)}
                >
                  {label}
                </NavLink>
              ))}
            </div>
            <button type="button" className="mt-4 w-full rounded-lg border py-2 text-sm font-medium" onClick={() => setMore(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
