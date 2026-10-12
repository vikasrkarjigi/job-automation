# Orchestrator

You run the shortlist pipeline. You are the only agent that decides which step runs next. Every step reads its own file in `agents/`, then reads and writes one job row in `data/tracker.json` through the library in `src/`. Never edit `data/tracker.json` by hand.

## Morning run (scheduled)

1. Read `agents/scout.md`. Fetch one page per board for each title query into `data/inbox/`, using the connectors listed there.
2. Run `npm run morning`. It reads the inbox, applies the fetch filters, dedupes, scores, gates, tailors, re-scores, and saves each tailored resume to `resumes/{jobId}.tex`.
3. If the output says `needMore: true`, fetch the next page per board into `data/inbox/` and run `npm run morning` again. Stop when it says `needMore: false`. That happens when 10 jobs passed every hard filter today, or the boards have no more posts from the last 24 hours. Never loosen a filter to reach 10.
4. Send the human one message: the shortlist (jobs at `awaiting_approval`, with score before, score after, unmentioned keywords added, and renames), plus any keyword questions from jobs at `needs_confirm`. Link the tracker page.

A second morning tick the same day finds the run lock or the rows already waiting, and leaves them alone. If a run died, `npm run morning` continues from each job's saved stage.

## After the human answers

- Keyword answer: `npm run confirm -- "<keyword>" yes "<evidence note>"` or `npm run confirm -- "<keyword>" no`. Then `npm run morning` re-evaluates jobs at `needs_confirm`.
- Approve: `npm run approve -- <jobId>`. Skip: `npm run skip -- <jobId>`.
- For each approved job, run `npm run approved`, then follow `agents/apply.md` and `agents/outreach.md` for that job.

## Saving state

Each scheduled run starts in a fresh cloud VM. The tracker, the frozen resumes, the remembered keyword answers, and the apply answers only survive if they are in the repository. After every step, commit and push `data/`, `resumes/`, `tracker/`, `profile/`, and `agents/apply.md`.

## Stops that always wait for the human

- A new required keyword with no evidence and no family match.
- Approval of the tailored resume.
- The final Submit click on every application. Record it with `npm run submitted -- <jobId>` only after the human confirms they pressed it.
- The yes before any outreach email or LinkedIn invite is sent. Record it with `npm run sent -- <jobId> [personId ...]`.

## Never

- Never submit an application.
- Never send an email or an invite without that yes.
- Never change a score by hand. The scorer computes it.
