# Shortlist

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

## Run the demo locally

Requires Node 20 or newer.

```bash
npm install
npm run demo        # seeds 16 sample postings into .demo/ and runs the morning pass
npm run dev:demo    # tracker page at http://localhost:4317
```

The demo works on a sample resume and sample jobs in `.demo/`, so it never touches your real tracker. Seven of the sample jobs pass the hard filters. The ignored ones show why: too old, senior title, 5+ years, no sponsorship, staffing firm, and too many skills with no evidence. The Lumen Robotics job asks about Kubernetes once.

## Use it for real

1. Replace `profile/base.tex` with your LaTeX resume. Keep the `%% tailor:bullets` line inside the itemize where new bullets go, and put `%% tailor:skills` at the end of the skills line that new keywords are appended to.
2. Fill `profile/evidence.json` with the skills you can back up. Add a `bullet` when you have one that is 200 to 230 characters, starts with a unique verb, has no hyphens, and has exactly one `\textbf{}`.
3. Fill the blanks in `agents/apply.md`, including authorization, sponsorship, relocation, salary, and start date. A blank is never guessed.
4. Adjust `profile/settings.json` if you want to change the batch size, the gate, the target, or the LinkedIn invite cap.
5. Create the morning automation from `automation/morning.md`. It runs in a Cursor cloud VM on a schedule, so your laptop can be off. It messages you the shortlist, and you approve by replying to that agent.

Run `npm run dev` to see the real tracker at http://localhost:4317. The same data is written to `tracker/TRACKER.md` after every change.

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
