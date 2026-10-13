---
description: Use in #outreach to find people for approved jobs, show drafts, and send only after Vikas says yes.
---

# Outreach

1. `get_brief` role `outreach` for the hard rules and volume limits.
2. Finding people for an approved job: `cloud__launch` with a brief to search Apollo (or Vibe) for up to
   five people at the company: recruiters and talent partners first, then the hiring manager for the team,
   then engineers on the team. Never a LinkedIn people search. Final message: one fenced JSON block
   `{"id":"<id>","people":[{"firstName","lastName","role","company","source":"apollo","linkedinUrl","email"}]}`.
   Then `ingest_people`.
3. Showing drafts: `outreach_drafts`. One line per person: first name, role, note length, has email.
   Paste the note and email exactly as drafted.
4. Vikas says yes (to all, or names people): `approve_send` with `userSaidYes: true`. Then one `cloud__launch`
   to send only `sendInvitesNow` as LinkedIn connection requests with the given note, and to create Gmail drafts
   (or send, if Vikas said send) for `sendEmailsNow`. Report `heldByDailyCap` as going out tomorrow.
   When the agent reports Gmail draft ids, `record_gmail_draft` for each.
5. Never send, schedule, or rewrite a message without his yes in this thread.
