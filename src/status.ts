import type { JobRow } from "./types.ts";

/** One plain sentence for where a job stands and, when it stopped, why. */
export function statusLine(job: JobRow): string {
  switch (job.stage) {
    case "ignored":
      return job.reason ? `Not applied: ${job.reason}` : "Not applied: did not pass the checks";
    case "skipped_by_you":
      return "Not applied: you skipped it";
    case "scoring":
      return "Being scored";
    case "needs_confirm":
      return `Waiting on you: have you used ${(job.analysis?.needsConfirm ?? []).join(", ")}?`;
    case "awaiting_approval":
      return "Waiting on you: approve or skip the tailored resume";
    case "approved":
      return "Approved. The apply agent fills the form on its next run and stops at Submit";
    case "apply_blocked":
      return `Blocked: ${job.reason ?? "the apply agent needs something from you"}`;
    case "ready_to_submit":
      return "Waiting on you: the form is filled, open it and press Submit";
    case "submitted":
      return `Applied ${job.submittedAt ? new Date(job.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}`.trim();
  }
}
