# Apply

Runs only for jobs the human approved. `npm run approved` builds an apply packet per job in `data/tracker.json`: the board URL, the ATS type, the frozen resume `resumes/{jobId}.tex`, and the answers below mapped onto that form's questions.

## What you do in the browser

1. Open the posting URL from the packet. Use Tsenta apply-with-custom-resume when the board supports it. Use the cloud browser for Workday, Greenhouse, Lever, and anything else.
2. If the board has no account for the email below, create one. If it has one, log in. The password is the secret named in the packet (`passwordSecret`). Never write it into this file.
3. If the board emails a one-time code, read the newest message from that company in Gmail and pass the text to `npm run otp -- <jobId> <file>` or `extractOtp` in `src/apply.ts`. Wait up to `otp_wait_minutes`, resend once, then stop and record the block.
4. Run `npm run pdf -- <jobId>` and upload the PDF path it prints. It is drawn from the frozen resume in the packet, so never edit the resume to make a form fit.
5. Fill every page. For each question, call `npm run answer -- <jobId> "<question text>"`. Use the returned answer. If it returns `BLOCKED`, stop and record the block. The question is appended below as a blank for the human.
6. Next and Save are fine. Stop when the button says Submit, Submit application, or Send application. Record `npm run ready -- <jobId>` and send the human the link to that page.

Also stop and record a block for a captcha you cannot pass, or a code that arrives by text or a phone call.

Never press Submit. The human does.

## Saved answers

Fill the blanks. A blank question is never guessed. Format: `- key (question): answer`.

- legal_name (Legal full name): Vikas Ravikumar Karjigi
- preferred_name (Preferred first name): Vikas
- email (Email): vikasravikarjigi26@gmail.com
- phone (Phone): (312) 273 8331
- city (Current city): San Francisco
- state (State): CA
- country (Country): United States
- linkedin (LinkedIn profile URL): https://linkedin.com/in/vikasrkarjigi
- github (GitHub URL): https://github.com/vikasrkarjigi
- website (Website or portfolio URL): https://vkarjigi-portfolio.vercel.app
- authorized_us (Are you legally authorized to work in the United States?):
- sponsorship_now (Will you now require visa sponsorship?):
- sponsorship_future (Will you in the future require visa sponsorship?):
- visa_type (Current visa or work authorization type):
- relocate (Are you willing to relocate?):
- target_cities (Preferred locations):
- work_mode (Remote, hybrid, or onsite preference):
- travel (Are you willing to travel?):
- start_date (Earliest start date):
- notice_period (Notice period):
- salary (Desired annual base salary):
- years_experience (Years of relevant experience):
- degree (Highest degree): Master's degree (Master of Applied Science)
- field_of_study (Field of study): Data Science
- previously_employed (Have you previously worked for this company?): No
- non_compete (Are you bound by a non compete agreement?):
- heard_about (How did you hear about this role?): Job board
- background_check (Are you willing to complete a background check?):
- drug_screen (Are you willing to undergo a drug screen?):
- over_18 (Are you at least 18 years old?):
- why_role (Why are you interested in this role?):
- gender (Gender, voluntary): Decline to answer
- race (Race or ethnicity, voluntary): Decline to answer
- veteran (Veteran status, voluntary): Decline to answer
- disability (Disability status, voluntary): Decline to answer

## Account and email code

- account_email (Email used for board accounts):
- otp_mailbox (Gmail mailbox that receives codes):
- otp_wait_minutes (Minutes to wait for a code): 5
- password_secret (Name of the secret holding the board password): BOARD_PASSWORD

## Questions the forms asked that need an answer

New questions are appended here as blanks. Answer once and every later form reuses it.
