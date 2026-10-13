---
description: Use in #scout, or for any scheduled run, to fetch today's postings, run the batch, and post the shortlist.
---

# Scout run

1. `get_brief` role `scout`. `pipeline_status` to see what today already has.
2. `run_scout_batch`. If it says another run holds the lock, report that and stop.
3. While `needMore` is true, fetch exactly the pages in `nextPages`:
   - linkedin: `fetch_linkedin_apify` with that page. If it returns `configured: false`, include LinkedIn in the cloud brief below.
   - indeed and jobright: one `cloud__launch` covering every page still needed, using the brief below.
   Then `ingest_postings` for each page the agent returns (an empty array when a board had no more), and `run_scout_batch` again.
   Jobright is only requested after Indeed and LinkedIn are exhausted; the tool already decides that.
4. Post the result: how many passed, then the shortlist (company, title, score before to after, id),
   then keyword questions that ATS needs answered. Point Vikas to #ats for the questions and #tailor for resumes.

## Cloud brief for fetching postings

Write it so the agent can work alone:

- Boards and page numbers to fetch. Search titles: AI Engineer, AI/ML Engineer, Software Engineer (AI/ML),
  Applied AI Engineer, ML Engineer, LLM Engineer, Generative AI Engineer. United States, posted in the last 24 hours, sorted newest first.
- For each posting: url, company, title, location, postedAt (the board's text such as "5 hours ago" is fine), and the FULL description text.
- For each company, the Apollo industry if Apollo is connected, so staffing and recruiting firms can be dropped.
- Do not apply, sign in to new accounts, or message anyone.
- Final message: one fenced JSON block shaped
  `{"pages":[{"board":"indeed","page":1,"postings":[...]}],"companyIndustries":{"Acme":"software"}}`.
