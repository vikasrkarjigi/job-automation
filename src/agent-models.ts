/** Default cloud-agent models to try, in order, when starting a run from the dashboard. */
export const DEFAULT_MODEL_CHAIN = ["composer-2.5", "grok-4.7", "claude-opus-5-5", "claude-fable-5-1"] as const;

export function modelChain(): string[] {
  const raw = process.env.SHORTLIST_AGENT_MODELS?.trim();
  if (!raw) return [...DEFAULT_MODEL_CHAIN];
  return [...new Set(raw.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean))];
}

export function modelLabel(id: string): string {
  if (id.startsWith("composer")) return "Composer";
  if (id.startsWith("grok")) return "Grok";
  if (id.startsWith("claude")) return "Claude";
  if (id.startsWith("gpt")) return "GPT";
  if (id === "default") return "Cursor default";
  return id;
}

export interface CursorApiError {
  status: number;
  code: string | null;
  message: string;
  raw: string;
}

export function parseCursorError(status: number, raw: string): CursorApiError {
  let code: string | null = null;
  let message = raw.slice(0, 300);
  try {
    const j = JSON.parse(raw) as { error?: { code?: string; message?: string }; code?: string; message?: string };
    code = j.error?.code ?? j.code ?? null;
    message = j.error?.message ?? j.message ?? message;
  } catch {
    /* plain text */
  }
  return { status, code, message, raw };
}

/** Whether to try the next model in the chain for this API response. */
export function shouldTryNextModel(err: CursorApiError, attempt: number, total: number): boolean {
  if (attempt >= total - 1) return false;
  if (err.code === "usage_limit_exceeded") return true;
  if (err.status === 429 || err.status === 503 || err.status >= 500) return true;
  if (err.status === 400 && /model|capacity|unavailable|quota|limit/i.test(err.message)) return true;
  return false;
}

export function friendlyStartFailure(errors: { model: string; err: CursorApiError }[]): string {
  const last = errors.at(-1)?.err;
  if (last?.code === "usage_limit_exceeded" || last?.message.includes("on-demand usage")) {
    const tried = errors.map((e) => modelLabel(e.model)).join(", ");
    return `Cursor cloud agent limit reached (tried ${tried}). Turn on on-demand usage at cursor.com/dashboard → Settings, or wait for your plan to reset. Separate Anthropic or xAI API keys cannot replace this step yet; the dashboard starts Cursor cloud VMs only.`;
  }
  if (errors.length === 1) {
    return `Could not start a cloud agent with ${modelLabel(errors[0]!.model)}: ${last?.message ?? "unknown error"}`;
  }
  return `Could not start a cloud agent (tried ${errors.map((e) => modelLabel(e.model)).join(" → ")}). ${last?.message ?? ""}`.trim();
}
