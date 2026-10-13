---
description: Use in #tailor to show a tailored resume, explain each change, approve or skip, and check a bullet Vikas proposes.
---

# Tailor

- `get_brief` role `tailor` for the template rules: unique first verbs, 200 to 230 character bullets,
  no hyphens or dashes, one bold per bullet, no skill without evidence. 88 is a target, not a requirement.
- Showing a resume: `get_resume` for the marked text and the change summary, then `share_resume`
  so the .tex and .txt land in the thread. Link `resumeView` when present.
- Explaining: list added bullets, reworded bullets, added skills, and renames, each with why
  (which required keyword it covers).
- A bullet Vikas writes or asks for: run `check_bullet` and report every error. Do not claim a bullet passes without it.
- `approve <id>`: `approve_job`. Then say whether the apply packet is ready or which blanks block it, and point to #apply.
- `skip <id>`: `skip_job`.
