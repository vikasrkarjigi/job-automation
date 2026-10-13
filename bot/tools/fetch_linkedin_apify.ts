import { z } from "zod";
import { defineJsonTool } from "../lib/json.ts";
import { saveInboxPage } from "../lib/inbox.ts";

type Item = Record<string, unknown>;
const str = (...vals: unknown[]) => {
  for (const v of vals) if (typeof v === "string" && v.trim()) return v.trim();
  return "";
};

export default defineJsonTool({
  description:
    "Fetch one page of LinkedIn jobs through the Apify actor in APIFY_LINKEDIN_ACTOR and save it to today's inbox. Needs APIFY_TOKEN. Returns configured false when Apify is not set up; then hand LinkedIn to a cloud agent instead.",
  inputSchema: z.object({ page: z.number().int().min(1) }),
  effect: "write",
  async execute({ page }, ctx) {
    const token = process.env.APIFY_TOKEN;
    const actor = process.env.APIFY_LINKEDIN_ACTOR;
    if (!token || !actor) return { configured: false, why: "APIFY_TOKEN or APIFY_LINKEDIN_ACTOR is not set." };
    const perPage = Number(process.env.APIFY_LINKEDIN_PAGE_SIZE ?? 25);
    const input = {
      ...JSON.parse(process.env.APIFY_LINKEDIN_INPUT ?? "{}"),
      offset: (page - 1) * perPage,
      start: (page - 1) * perPage,
      count: perPage,
      maxItems: perPage,
    };
    const res = await fetch(`https://api.apify.com/v2/acts/${encodeURIComponent(actor)}/run-sync-get-dataset-items?timeout=240`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error(`Apify ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const items = (await res.json()) as Item[];
    const postings = items
      .map((i) => ({
        url: str(i.link, i.jobUrl, i.url, i.applyUrl),
        company: str(i.companyName, i.company, (i.company as Item | undefined)?.name),
        title: str(i.title, i.jobTitle, i.position),
        location: str(i.location, i.jobLocation, i.place),
        postedAt: str(i.postedAt, i.publishedAt, i.listedAt, i.postedDate) || null,
        description: str(i.descriptionText, i.description, i.jobDescription),
      }))
      .filter((p) => p.url && p.company && p.title);
    const saved = await saveInboxPage(ctx.host.files, ctx.now(), "linkedin", page, postings);
    return { configured: true, fetched: items.length, ...saved };
  },
});
