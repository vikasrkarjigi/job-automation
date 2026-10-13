# Shortlist

Shortlist runs in Slack. Each channel is one agent you can talk to, and the whole flow keeps running on Cursor hosting with your laptop closed. A web tracker shows the same pipeline with readable tailored resumes.

A job pipeline for entry level AI engineer roles. Every morning it fetches postings from the last 24 hours, drops anything that fails a hard filter, scores the rest against your resume in code, tailors only the jobs that can honestly clear the bar, and waits for you. Applications stop on the Submit page and outreach stops at drafts until you say yes. A tracker records every job, the exact resume each one received, and every person contacted.

## How a day runs

1. **Scout** (`agents/scout.md`, `src/scout.ts`). Fetches Indeed, LinkedIn through Apify, and Jobright last. Only posts under 24 hours old are kept, and posts with no timestamp are dropped. It keeps the AI Engineer, AI/ML Engineer, Software Engineer (AI/ML), Applied AI, Machine Learning, LLM, and Generative AI Engineer titles. Required experience must be 0 to 3 years, and the posting must offer sponsorship or say nothing about it. Staffing firms are dropped by blocklist, Apollo category, or phrases like "our client". The same job on several boards becomes one row. The scout keeps paging until 10 jobs pass, or the boards run out of posts from the last day. It never pads the batch.
2. **ATS scorer** (`agents/ats-score.md`, `src/ats.ts`). Matches a fixed keyword dictionary. Required keywords weigh 1 and preferred weigh 0.4. When a posting has no Required and Preferred headings, every keyword counts as required. The score is the integer `100 * matched / total`, so the same inputs always give the same number.
3. **Gate.** A job is tailored only when every required keyword can be covered honestly. Covered means it is already on the resume, it is in your evidence bank, a skill from the same family can be renamed, or you confirmed it once. The ceiling also has to reach 80. Anything else is ignored with a one-line reason.
4. **Tailor** (`agents/resume-tailor.md`, `src/tailor.ts`). Renames skills within a family (Pinecone becomes FAISS when the job asks for FAISS), adds evidence bullets that pass the checker, appends keywords to the skills line, and then scores the result again. The file is frozen at `resumes/{jobId}.tex`. If the honest result is 84, the row stores 84.
5. **You approve** the tailored resume.
6. **Apply** (`agents/apply.md`, `src/apply.ts`). Creates the board account or logs in, reads the one-time code from Gmail, and fills every page from the saved answers. It stops on Submit. A question it has no answer for is added to `apply.md` once, for you to fill.
7. **Outreach** (`agents/outreach.md`, `src/outreach.ts`). Finds five people from Apollo or Vibe and writes Gmail drafts and LinkedIn notes. Every message names the role and the company, uses first names only, has no hyphens or dashes, and keeps notes under 300 characters. Invites respect a daily cap. Nothing is sent until you say yes.

`agents/orchestrator.md` chains these steps. Your answers to keyword questions are saved in `profile/confirmed-keywords.md` and reused on later jobs.

## Slack: one agent per channel

| Channel | What you can ask | What it posts |
| --- | --- | --- |
| #scout | "run now", "what did today's run find" | Scheduled runs at 4 am, 12 pm, 8 pm, and the shortlist |
| #ats | "why was Kestrel ignored", "yes, I used Kubernetes on the gateway" | Keyword questions, asked once and remembered |
| #tailor | "resume northwind-labs-ai-engineer-4e8c4a", "approve <id>", "check this bullet" | The .tex and a readable copy with every change marked |
| #apply | "salary is 120000", "I submitted <id>" | Blanks it needs, and the link to press Submit yourself |
| #outreach | "show drafts for <id>", "yes send" | Drafts, then what went out and what the daily cap held |
| #tracker | "status", "what did I apply to this week", "resume for Sable" | Digests after each run |

How it is built (`bot/`, using `@cursor/bdk`):

- `bot/channels/slack.ts` watches the six channels. The channel a message arrives in picks the role, which loads that role's skill (`bot/skills/*.md`) and brief (`agents/*.md`). Mentions and DMs work too.
- `bot/tools/*.ts` are thin wrappers over the same pipeline code in `src/`, so scores, filters, gates, and stage changes are deterministic. `bot/lib/state.ts` runs that code against hosted durable storage, so nothing depends on your machine.
- Browser work (Indeed, Jobright, Apollo, Vibe, Gmail, application forms) is handed to a Cursor cloud agent, and the thread wakes when that agent finishes. LinkedIn goes through Apify directly when `APIFY_TOKEN` is set.
- `bot/schedules/pipeline-run.ts` checks hourly and runs only at 4, 12, and 20 local time (`SHORTLIST_TZ`, default `America/Chicago`; `SHORTLIST_RUN_HOURS` to change). Post in #scout to run it by hand.
- Every tailored resume is kept in storage and as a `tailored-resume` artifact. When you submit, the exact file is locked to that job.

### Connect it (one time)

1. Create channels `#scout`, `#ats`, `#tailor`, `#apply`, `#outreach`, `#tracker` in your Slack workspace.
2. `npx bdk login`, then `npx bdk slack create --dir . --name Shortlist --prefix SHORTLIST --channel-posts` and approve the app in the browser. Invite the bot to all six channels.
3. Put the channel ids in `.env.local` and in the deployment env before deploying, because the watched-channel list is published with the app: `SHORTLIST_CHANNEL_SCOUT=C...` and so on for `ATS`, `TAILOR`, `APPLY`, `OUTREACH`, `TRACKER`. Optional: `SHORTLIST_OWNER_SLACK_ID` so only you can drive it, `SHORTLIST_WEB_URL` for resume links, `APIFY_TOKEN` and `APIFY_LINKEDIN_ACTOR` for LinkedIn.
4. `npx bdk slack doctor --prefix SHORTLIST`, then `npx bdk serve --dir . --dev` to try it locally.
5. Push, then `npx bdk deploy --dir . --slug shortlist` (needs `CURSOR_SERVICE_ACCOUNT_KEY`) so it runs on Cursor hosting. Add `BOARD_PASSWORD` as a Cloud Agents secret for account creation.

## Run the demo locally

Requires Node 22.13 or newer.

```bash
npm install
npm run demo        # seeds 16 sample postings into .demo/ and runs the morning pass
npm run dev:demo    # tracker page at http://localhost:4317
```

The demo works on a sample resume and sample jobs in `.demo/`, so it never touches your real tracker. Seven of the sample jobs pass the hard filters. The ignored ones show why: too old, senior title, 5+ years, no sponsorship, staffing firm, and too many skills with no evidence. The Lumen Robotics job asks about Kubernetes once.

## Use it for real

1. `profile/base.tex` is converted from your PDF resume. Replace it with your own LaTeX source when you have it. Keep the `%% tailor:bullets` line inside the itemize where new bullets go, and put `%% tailor:skills` at the end of the skills line that new keywords are appended to.
2. Fill `profile/evidence.json` with the skills you can back up. Add a `bullet` when you have one that is 200 to 230 characters, starts with a unique verb, has no hyphens, and has exactly one `\textbf{}`.
3. Fill the blanks in `agents/apply.md`, including authorization, sponsorship, relocation, salary, and start date. A blank is never guessed.
4. Adjust `profile/settings.json` if you want to change the batch size, the gate, the target, or the LinkedIn invite cap.
5. Connect Slack (above). Without Slack, `automation/morning.md` is a Cursor Automation fallback.

Run `npm run dev` to see the real tracker at http://localhost:4317. Open any job's resume to see it formatted, with added bullets in green, reworded bullets in amber, and a Save as PDF button. The Resumes tab lists every tailored resume, and submitted ones are marked. The same data is written to `tracker/TRACKER.md` after every change.

## Commands

| Command | What it does |
| --- | --- |
| `npm run morning` | Scout, filter, score, gate, and tailor today's inbox. Prints the shortlist and the next pages to fetch. |
| `npm run confirm -- "Kubernetes" yes "where"` | Answer a keyword question once. Waiting jobs are re-evaluated. |
| `npm run approve -- <jobId>` / `npm run skip -- <jobId>` | Your decision on a tailored resume. |
| `npm run approved` | Build apply packets and outreach drafts for approved jobs. |
| `npm run answer -- <jobId> "<question>"` | Answer a form question from `apply.md`, or block and add it. |
| `npm run ready -- <jobId>` | The form is filled and sitting on Submit. |
| `npm run submitted -- <jobId>` | You pressed Submit. Records which resume was sent. |
| `npm run sent -- <jobId> [personId...]` | You said yes. Marks invites and emails sent, under the daily cap. |
| `npm run check-bullet -- "<bullet>" <jobId>` | Run the bullet checker on a draft from a writer model. |
| `npm test` | Unit tests for the filters, gate, tailor, apply, and outreach rules. |
