# Writing style for application answers

Every open ended answer on a form ("Why are you interested in this role?", "Describe a project you are proud of", "Tell us about a time...") is written fresh for that job, in Vikas's voice. It should read like a thoughtful engineer typed it himself in ten minutes, not like a template or a chatbot.

`npm run write` rejects an answer that breaks the checkable rules below. The rest are on you.

## Voice

- First person, plain words, short to medium sentences. Mix sentence lengths.
- Confident and specific, never gushing. State what you did and what you want to do next.
- Write the way you would explain it to a senior engineer over coffee.
- Use contractions where they sound natural ("I've", "that's").

## Substance

- Open with something specific to this company or role, taken from the posting: the product, the users, the problem, or the stack. Never open with "I am excited" or a restatement of the job title.
- Back it with one or two real results from the resume, with the number. Pick the ones closest to this posting. Example: the clinical RAG pipeline that cut clinician time to answer 60%, the guardrail agent that cut hallucinations 72%, the Slack agent at 97% grounded responses, or First Place at the Anthropic Claude Builders Hackathon.
- Connect the two: what you built maps to what they are building.
- End with what you want to work on there, in one sentence. No sign off.
- Only claim skills that are on the resume, in `profile/evidence.json`, or confirmed in `profile/confirmed-keywords.md`.
- If Vikas left notes in the `why_role` answer in `agents/apply.md`, work them in.

## Length

- "Why this role" or "why this company": 90 to 150 words.
- Other open ended questions: 60 to 180 words, unless the form gives a limit. A form limit always wins.

## Never

- Dashes of any kind (— – or a spaced hyphen), exclamation marks, emoji.
- These words and phrases: excited to, thrilled, passionate about, leverage, delve, tapestry, synergy, cutting edge, dynamic team, fast paced, in today's, ever evolving, unique opportunity, perfect fit, great fit, aligns perfectly, resonates, testament, embark, journey, furthermore, moreover, in conclusion, game changer, seamless, robust, holistic, spearheaded, honed, foster, realm, landscape, elevate, unlock, empower, I hope this, Dear Hiring Manager.
- Lists of buzzwords, or more than four technologies in one sentence.
- Flattery of the company ("industry leader", "world class").
