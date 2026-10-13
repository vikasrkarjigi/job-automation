import { z } from "zod";
import { defineJsonTool } from "../lib/json.ts";
import { saveInboxPage } from "../lib/inbox.ts";

const Posting = z.object({
  url: z.string(),
  company: z.string(),
  title: z.string(),
  location: z.string().default(""),
  postedAt: z.string().nullable().describe("When the job was posted: ISO-8601, or the board's relative text such as \"3 hours ago\". Null when unknown; such postings are dropped."),
  description: z.string().describe("Full job description text, untrimmed."),
});

export default defineJsonTool({
  description:
    "Save one page of raw postings from a board into today's inbox. Pass an empty postings array when the board has no more results so the scout knows it is exhausted. Optionally record company industries (from Apollo) for the agency filter. Run run_scout_batch afterwards.",
  inputSchema: z.object({
    board: z.enum(["indeed", "linkedin", "jobright"]),
    page: z.number().int().min(1),
    postings: z.array(Posting),
    companyIndustries: z.record(z.string()).optional().describe("Company name to Apollo industry, e.g. {\"Acme Talent\": \"staffing & recruiting\"}"),
  }),
  effect: "write",
  async execute({ board, page, postings, companyIndustries }, ctx) {
    return saveInboxPage(ctx.host.files, ctx.now(), board, page, postings, companyIndustries);
  },
});
