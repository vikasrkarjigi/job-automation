/** Cloud run status — shared by server and client UI (no Node imports). */

export type RunStatus = "CREATING" | "RUNNING" | "FINISHED" | "ERROR" | "CANCELLED" | "EXPIRED";
export const ACTIVE: RunStatus[] = ["CREATING", "RUNNING"];

export interface RunInfo {
  status: RunStatus;
  durationMs: number | null;
  result: string | null;
}
