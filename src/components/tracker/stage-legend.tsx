import { LEGEND_ITEMS, STAGE_LABEL, stageBadgeClass } from "./stage-styles";

export function StageLegend() {
  return (
    <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Stage colors</p>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
        {LEGEND_ITEMS.map(({ stage, label }) => (
          <li key={stage} className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className={stageBadgeClass(stage)}>{STAGE_LABEL[stage]}</span>
            <span>{label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
