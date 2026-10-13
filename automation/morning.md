# Cursor Automation (fallback)

The Slack bot in `bot/` is the main way to run Shortlist. It runs on a schedule at 4 am, 12 pm, and 8 pm Chicago time, and whenever you post in #scout. Use this Automation only if you want the pipeline without Slack.

Paste the prompt below into a Cursor Automation at cursor.com/automations.

- Trigger: manual, plus a schedule at 4:00, 12:00, and 20:00 in your time zone (cron `0 4,12,20 * * *`). Nothing else.
- Repository: this repository, branch `main`.
- Connectors the automation needs: Indeed, Apify, Apollo, Gmail, Tsenta. Board passwords go in Cloud Agents secrets as `BOARD_PASSWORD`.
- The run happens in a Cursor cloud VM, so your laptop can be off.

The VM is fresh on every run. Everything the pipeline remembers lives in the repository, so the agent commits and pushes after each step.

## Prompt

```
You are the orchestrator for the shortlist pipeline in this repository.

1. Run npm ci. Read agents/orchestrator.md and follow it exactly.
2. Read agents/scout.md. Fetch page 1 for each board into data/inbox/<today>/ using the
   Indeed connector and the Apify LinkedIn jobs actor. Look up every new company in Apollo and
   record its industry in data/companies.json.
3. Run npm run morning. While it prints "needMore": true, fetch exactly the pages listed in
   "nextPages" and run npm run morning again. An empty page means that board is finished, so write [] for it.
4. Commit and push data/, resumes/, and tracker/ with the message "Morning run <date>".
5. Reply with the shortlist from the last npm run morning output: for each job, the title, company,
   score before and after, keywords added or renamed, and the job id. Then list each keyword question
   from "needsConfirm". End with: reply "approve <id>", "skip <id>", "yes <keyword> <where you used it>",
   or "no <keyword>".

When I reply:
- "yes <keyword> <note>" or "no <keyword>": npm run confirm -- "<keyword>" yes "<note>" (or no), then
  report any job that moved to awaiting_approval.
- "approve <id>": npm run approve -- <id>, then follow agents/outreach.md to write people into
  data/people/<id>.json from Apollo or Vibe, then npm run approved, then follow agents/apply.md in the
  browser until the Submit page. Save Gmail drafts and record each with npm run gmail-draft.
  Send me the form link and the drafts. Do not press Submit. Do not send anything.
- "submitted <id>": npm run submitted -- <id>.
- "send <id>": send that job's drafts and invites, then npm run sent -- <id>.
After every step, commit and push data/, resumes/, tracker/, agents/apply.md, and profile/.
```
