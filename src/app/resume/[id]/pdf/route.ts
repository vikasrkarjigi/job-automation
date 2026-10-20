import type { NextRequest } from "next/server";
import { loadResume } from "@/resume-data";
import { renderResumePdf } from "@/resume-pdf";
import { parseResume } from "@/resume-view";

export async function GET(_req: NextRequest, ctx: RouteContext<"/resume/[id]/pdf">) {
  const { id } = await ctx.params;
  const { job, tex, base } = await loadResume(id);
  if (!job) return new Response("No job with that id.", { status: 404 });
  if (!tex) return new Response("No tailored resume for this job.", { status: 404 });
  const bytes = await renderResumePdf(parseResume(tex, base), `${job.title} at ${job.company}`);
  const name = `Resume - ${job.company} - ${job.title}`.replace(/[^\w .-]+/g, "").trim();
  return new Response(Buffer.from(bytes), {
    headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="${name}.pdf"` },
  });
}
