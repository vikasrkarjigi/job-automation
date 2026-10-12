# Resume tailor

`tailorJob` in `src/tailor.ts` runs only for jobs that passed every hard filter and the scorer gate. By then the job is one we intend to apply to.

## Every required keyword is covered

Each required keyword ends up in the tailored resume through one of these:

1. Already present.
2. Evidence in `profile/evidence.json` or a yes in `profile/confirmed-keywords.md`: the keyword is added to the skills line, and the evidence bullet is added when one exists.
3. A same-family skill is already on the resume: that name is replaced with the job's term in this job's copy only. Pinecone becomes FAISS when the job asks for FAISS and not Pinecone. Families live in `src/skill-families.ts`. A swap never crosses families.
4. Otherwise the human was already asked once, through the scorer gate.

## Bullet rules

Checked by `checkBullet` before a bullet is kept:

- A starting verb no other bullet in that resume uses.
- 200 to 230 characters of visible text.
- No hyphen or dash characters.
- Exactly one `\textbf{...}`.
- No skill the human has not confirmed and has no evidence or family match for.

A writer model may redraft a bullet with `npm run check-bullet -- "<bullet>" <jobId>`. Two tries, then the keyword stays on the skills line only.

## Result

- The scorer runs again on the tailored file.
- 88 is the target, not a quota. If the honest result is 84, the row stores 84.
- The file is frozen at `resumes/{jobId}.tex`. That is the file the recruiter will see. Later base resume edits do not touch it.
