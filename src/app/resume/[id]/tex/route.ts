import type { NextRequest } from "next/server";
import { loadResume } from "@/resume-data";

export async function GET(_req: NextRequest, ctx: RouteContext<"/resume/[id]/tex">) {
  const { id } = await ctx.params;
  const { job, tex } = await loadResume(id);
  if (!job) return new Response("No job with that id.", { status: 404 });
  if (!tex) return new Response("No tailored resume for this job.", { status: 404 });
  return new Response(tex, {
    headers: { "content-type": "text/plain; charset=utf-8", "content-disposition": `inline; filename="${id}.tex"` },
  });
}
