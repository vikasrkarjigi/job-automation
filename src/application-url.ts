import type { ApplyPacket, JobRow, Stage } from "./types.ts";

/** Best URL for a human to open the in-progress or submit page (not just the job posting). */
export function resolveApplicationUrl(job: JobRow): string | null {
  const packet = job.applyPacket;
  if (packet?.submitPageUrl?.trim()) return packet.submitPageUrl.trim();
  if (packet?.applyFlowUrl?.trim()) return packet.applyFlowUrl.trim();
  const posting = packet?.url ?? job.sources[0]?.url ?? null;
  if (!posting) return null;
  return enhanceBoardUrl(posting, packet?.ats ?? detectAtsFromUrl(posting), job.stage);
}

export function resolvePostingUrl(job: JobRow): string | null {
  return job.applyPacket?.url ?? job.sources[0]?.url ?? null;
}

export function detectAtsFromUrl(url: string): ApplyPacket["ats"] {
  if (/myworkdayjobs|workday/i.test(url)) return "workday";
  if (/greenhouse\.io/i.test(url)) return "greenhouse";
  if (/lever\.co/i.test(url)) return "lever";
  return "other";
}

export function enhanceBoardUrl(url: string, ats: ApplyPacket["ats"], stage: Stage): string {
  try {
    const u = new URL(url);
    if (ats === "greenhouse" && /greenhouse\.io/i.test(u.hostname) && !/\/apply\/?$/i.test(u.pathname)) {
      u.pathname = u.pathname.replace(/\/?$/, "") + "/apply";
      return u.toString();
    }
    if (ats === "lever" && /jobs\.lever\.co/i.test(u.hostname) && !/\/apply\/?$/i.test(u.pathname)) {
      u.pathname = u.pathname.replace(/\/?$/, "") + "/apply";
      return u.toString();
    }
    if (/linkedin\.com/i.test(u.hostname) && /\/jobs\/view\//i.test(u.pathname)) {
      u.search = "";
      if (stage === "ready_to_submit" || stage === "submitted") {
        u.hash = "";
      }
      return u.toString();
    }
    if (/indeed\.com/i.test(u.hostname) && stage !== "ignored") {
      return u.toString();
    }
  } catch {
    /* keep raw */
  }
  return url;
}

export type ApplicationLinkKind = "submit" | "in_progress" | "posting";

export function applicationLinkMeta(job: JobRow): { url: string; kind: ApplicationLinkKind; label: string } | null {
  const packet = job.applyPacket;
  const submit = packet?.submitPageUrl?.trim();
  if (submit) {
    return { url: submit, kind: "submit", label: "Open application review" };
  }
  const flow = packet?.applyFlowUrl?.trim();
  if (flow) {
    return { url: flow, kind: "in_progress", label: "Continue application" };
  }
  const posting = resolvePostingUrl(job);
  if (!posting) return null;
  const url = enhanceBoardUrl(posting, packet?.ats ?? detectAtsFromUrl(posting), job.stage);
  const onBoard =
    job.stage === "ready_to_submit"
      ? "Open job board to Submit"
      : job.stage === "approved" || job.stage === "apply_blocked"
        ? "Open job board application"
        : "Open job posting";
  return { url, kind: "posting", label: onBoard };
}
