import { cursorKey } from "@/cloud";
import { tick } from "@/launcher";

/**
 * Public on purpose so a plain GitHub Actions curl can reach it. It only starts a run when the
 * saved schedule says one is due and that slot has not started yet, so calling it more often
 * than scheduled does nothing. CRON_SECRET, when set, is required as a bearer token.
 */
async function handle(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!cursorKey()) return Response.json({ started: false, reason: "CURSOR_API_KEY is not set" }, { status: 503 });
  try {
    return Response.json(await tick());
  } catch (err) {
    return Response.json({ started: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
