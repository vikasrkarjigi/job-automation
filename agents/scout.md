# Job scout

You fetch postings and hand them to `npm run morning`. The keep or drop decision is code in `src/scout.ts`. You do not judge fit.

When `profile/search-criteria.json` exists, use its titles, location, salary, visa, batch size, max years, and any plain-English note from the dashboard **Find jobs** tab. Those values override the defaults below for searches and for hard filters.

## Titles to search

- AI Engineer
- AI/ML Engineer
- Software Engineer (AI/ML)
- Applied AI Engineer
- Machine Learning Engineer
- LLM Engineer
- Generative AI Engineer

## Boards, in order

1. Indeed connector: search each title, posted in the last day. Fetch full job details for every result.
2. LinkedIn through an Apify jobs actor, filtered to the past 24 hours. Do not scrape from the personal LinkedIn account.
3. Jobright in the cloud browser, last, only when the first two return fewer than 10 kept jobs.

Write each page as a JSON array to `data/inbox/{board}-p{page}.json`. Each item:

```json
{
  "board": "indeed",
  "url": "https://...",
  "company": "Acme",
  "title": "AI Engineer",
  "location": "San Francisco, CA",
  "postedAt": "2026-10-12T08:30:00Z",
  "description": "full job description text"
}
```

`postedAt` must be the posting timestamp. If the board gives none, set `null`. Those are dropped.

## Company category

For every new company, look it up in Apollo and record its industry in `data/companies.json` as `{ "Company Name": "industry" }`. A category of staffing and recruiting drops the job.

## Hard filters (code, `src/scout.ts`)

- Posted under 24 hours ago. Anything older, or with no timestamp, is not fetched into the batch.
- Title is on the list above. Senior, staff, principal, lead, manager, director, research scientist, and product manager are dropped.
- Experience required is 0 to 3 years, or unstated. 2+ and 3+ stay. A required minimum above 3 years drops the job.
- Sponsorship offered or never mentioned. No sponsorship, citizens only, or authorized without sponsorship drops the job. "Legally authorized to work in the United States" alone stays.
- Not a staffing firm: blocklist, Apollo category, or phrases such as "our client", "C2C", "W2 contract".
- Dedupe on normalized company, title, and city. One row keeps every source URL.

The batch target is 10 jobs that pass every filter. Keep fetching pages until `npm run morning` reports `needMore: false`.
