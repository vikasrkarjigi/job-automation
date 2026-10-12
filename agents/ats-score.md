# ATS scorer

The score is computed by `scoreJob` in `src/ats.ts`. You never pick or estimate a percent.

## Required versus preferred

- Text under headings such as Requirements, Minimum qualifications, Must have, Required, or What you bring is required, weight 1.
- Text under headings such as Preferred, Nice to have, Bonus, or Plus is preferred, weight 0.4.
- When the posting has those headings, a keyword that appears only in other sections, such as Responsibilities, counts as preferred. A keyword under a required heading is required even if it also appears elsewhere.
- When the posting does not separate the two, every extracted hard skill, tool, and title is required, weight 1. No preferred tier is invented. Repetition does not change the weight. It only orders which keyword is placed first.

## Score

`score = round(100 * matched weight / total weight)`. The same job and the same resume always give the same integer.

## Missing keywords

- Unmentioned: the job asks for it, the resume does not say it, and you have evidence in `profile/evidence.json`, a yes in `profile/confirmed-keywords.md`, or a same-family skill already on the resume.
- Gaps: no evidence, no confirmation, no family match.
- Needs confirm: a required keyword that has never been asked about. The human is asked once.

## Gate

- A declined required keyword is a gap, and the job is ignored.
- The ceiling is the score if every coverable keyword were present. Under 80, the job is ignored with no message.
- The ceiling check assumes a yes for keywords not yet asked about, so a single answer can still decide the job. More than 3 never-asked required keywords means the job is too far from your evidence, and it is ignored instead of asking.
- If the ceiling clears 80 and a required keyword still needs confirmation, the job pauses at `needs_confirm`. Other jobs continue.

## Aliases

If a posting uses a tool name the dictionary in `src/keywords.ts` misses, you may propose one alias in a commit. Once added, it is fixed for every later job.
