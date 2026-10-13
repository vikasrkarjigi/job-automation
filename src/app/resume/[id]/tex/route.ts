import fs from "node:fs";
import path from "node:path";
import type { NextRequest } from "next/server";
import { root } from "@/settings";
import { loadTracker } from "@/tracker";

export async function GET(_req: NextRequest, ctx: RouteContext<"/resume/[id]/tex">) {
  const { id } = await ctx.params;
  const job = loadTracker().jobs.find((j) => j.id === id);
  const rel = job?.submittedResumePath ?? job?.resumePath;
  if (!rel) return new Response("No tailored resume for this job.", { status: 404 });
  const file = path.join(root(), rel);
  if (!file.startsWith(path.join(root(), "resumes") + path.sep) || !fs.existsSync(file)) {
    return new Response("Resume file is missing.", { status: 404 });
  }
  return new Response(fs.readFileSync(file, "utf8"), {
    headers: { "content-type": "text/plain; charset=utf-8", "content-disposition": `inline; filename="${id}.tex"` },
  });
}
