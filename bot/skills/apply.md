---
description: Use in #apply to fill saved answers, launch the form-filling cloud agent, and record ready, blocked, or submitted.
---

# Apply

1. `pipeline_status` for approved, blocked, and ready jobs. `get_brief` role `apply` for the full rules.
2. Blocked on blanks: ask Vikas for each blank in one message. On his reply call `save_answer`
   per key with his words. It unblocks packets automatically.
3. Filling a job: `apply_packet`, then `cloud__launch` with this brief:
   - The application URL, ATS type, and the account email. The password is the `BOARD_PASSWORD` secret.
     If an account is needed, create it with that email and password. Read the one-time code from the
     `otp_mailbox` Gmail inbox (wait up to `otp_wait_minutes`), from a message newer than the request
     that names the company. Never print the code or the password.
   - Upload the resume: paste `resumeTex` into a file named `<id>.tex`, and if the form wants a PDF, compile
     it (tectonic or pdflatex) or ask in the report. Upload exactly that file.
   - Every saved answer from `savedAnswers`. Voluntary questions default to "Decline to answer".
     For any question with no saved answer, stop and report it word for word. Do not guess.
   - Fill every page, then STOP on the final review page. Do NOT press Submit.
   - Final message: one fenced JSON block
     `{"id":"<id>","status":"ready"|"blocked","reason":"...","unanswered":["question text"],"desktopUrl":"<link to this agent>"}`.
4. When it stops: `ready` means `update_application` status `ready` with `submitLink` set to the agent's URL, and tell Vikas
   to open it and press Submit himself. `blocked` means `update_application` blocked with the reason, and for each
   unanswered question `answer_question` (adds it to apply.md), then ask Vikas.
5. When Vikas says he submitted: `update_application` status `submitted`. Confirm the exact resume file recorded.
