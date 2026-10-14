# Cursor Automation: scheduled job runs

This Automation runs the pipeline at 4 am, 12 pm, and 8 pm San Francisco time. You answer the results in Slack with @Cursor, and `.cursor/rules/slack-channels.mdc` handles those replies.

Set it up at cursor.com/automations:

- Repository: `vikasrkarjigi/job-automation`, branch `main`.
- Trigger: Schedule, cron `0 4,12,20 * * *`, time zone `America/Los_Angeles`.
- Tools: Slack (post to #scout). Remove Open Pull Request, because state is pushed straight to `main`. Add the Indeed, Apollo, and Gmail MCPs when you have them.
- Secrets (Cloud Agents > Secrets): `APIFY_TOKEN` for LinkedIn, `BOARD_PASSWORD` for job board accounts.
- The run happens in a Cursor cloud VM, so your laptop can be off. The VM is fresh on every run, so everything the pipeline remembers lives in the repository.

## Prompt

```
You are the orchestrator for the Shortlist job pipeline in this repository. This is a scheduled run.

1. Run npm ci. Read agents/orchestrator.md and agents/scout.md and follow them exactly.
2. Fetch page 1 of every board in agents/scout.md into data/inbox/<today>/. Use the Indeed MCP and the
   Apify LinkedIn actor (APIFY_TOKEN) when available. For a board with no connector, open its search
   page in the browser and save the postings in the same format. Record each new company's industry
   in data/companies.json, from Apollo when available.
3. Run npm run morning. While it prints "needMore": true, fetch exactly the pages in "nextPages" and
   run it again. An empty page means that board is finished, so write [] for it.
4. Run npm run export. Commit data/, resumes/, and tracker/ with the message "Scheduled run <date> <time>",
   then git pull --rebase origin main and git push origin main. Do not create a branch or a pull request.
5. Post to Slack #scout: for each job at awaiting_approval, the title, company, score before and after,
   keywords added or renamed, the job id, and the resume link
   https://github.com/vikasrkarjigi/job-automation/blob/main/resumes/<jobId>.tex.
   Then list each keyword question from "needsConfirm". End with the replies I can send:
   "@Cursor approve <id>" or "@Cursor skip <id>" in #apply, and
   "@Cursor yes <keyword> <where you used it>" or "@Cursor no <keyword>" in #ats.
   If nothing new passed the filters, say so in one line with the counts from the output.

Never press Submit, never send an email or invite, never search for people on LinkedIn, and never
loosen a filter to fill the batch.
```
