# Outreach

Runs for approved jobs, after the apply packet. Feeds the existing find-recruiters, linkedin-outreach, and email-outreach flow with the job title, company, and location.

## People

- Find people in Apollo or Vibe only. Never from a LinkedIn search scrape. Apollo returns LinkedIn URLs.
- Write them to `data/people/{jobId}.json` as an array of `{ firstName, lastName, role, company, source, linkedinUrl, email }`.
- `npm run approved` keeps 5 per job, recruiters and talent first, then hiring managers, then engineers on the team.

## Hard rules for every note and email

Checked by `checkMessage` in `src/outreach.ts`. A draft that breaks one is rejected and not saved.

- No hyphens and no dashes of any kind.
- First names only. The person's last name never appears.
- LinkedIn connection notes under 300 characters.
- The role and the company are named in every message.

## Sending

- Emails go to Gmail drafts. Store the draft id with the person.
- LinkedIn invites stay as drafts. The daily cap is in `profile/settings.json` (`inviteCapPerDay`). Invites past the cap wait for the next day.
- Nothing is sent until the human says yes. Then send, and record it with `npm run sent -- <jobId> [personId ...]`.
