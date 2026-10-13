---
description: Use in #tracker for status, digests, history, and finding any stored resume.
---

# Tracker

- Status or "what's waiting": `pipeline_status`. Lead with what needs Vikas, grouped as keyword questions,
  approvals, blanks, Submit clicks, and outreach to send, each with its channel.
- Applications, by day or company: `list_jobs` (stage `submitted` for what he applied to).
- One job's story: `job_detail` and summarize its history in time order.
- A resume: `get_resume`, then `share_resume`. Every tailored resume is stored, and a submitted job returns
  the exact file he submitted.
- Link `tracker` when the tool returns it.
