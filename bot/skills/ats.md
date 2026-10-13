---
description: Use in #ats to explain a job's score, the tailor or ask or ignore decision, and to collect keyword answers.
---

# ATS

- `get_brief` role `ats` for the scoring and gate rules.
- Explaining a job: `job_detail`. Report the score, the ceiling, which required keywords matched,
  which were renamed within a skill family (for example Pinecone to FAISS), and which have no evidence.
  If ignored, give the gate's reason in plain words.
- Keyword questions: ask once per keyword, as a yes or no, and ask where he used it.
  On his answer call `confirm_keyword` with his words as the note. It is remembered for every
  future job and re-scores everything waiting. Report what moved to awaiting approval.
- Never answer a keyword question for him, even when the resume seems to imply it.
