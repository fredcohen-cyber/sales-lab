# Sales Lab

Practice, coaching, and reporting for the shared Omnizant and Ravenly sales team. Reps choose a stage of
the sale, answer the buyer's question in writing, get AI coaching grounded in approved source material, and
then answer the buyer's pushbacks, one objection after another. In Practice Studio-Voice they practice the
same moments as phone calls, out loud, and get the same written coaching on the transcript. Managers assign ordered practice, review
evaluations, and follow performance and engagement. Scores are for coaching and development only, not
employment decisions or rankings.

## Deploy on Railway

The repository deploys as one Node service plus a Railway Postgres database. Railway builds it with its
default Node builder: it installs dependencies, runs `npm run build` (the web app), and starts
`npm start` (the server, which applies database migrations and seed content on every start).

1. In Railway, create a project with **Deploy from GitHub repo** and pick `fredcohen-cyber/sales-lab`.
2. In the same project, add a **PostgreSQL** database.
3. Open the `sales-lab` service, then **Variables**, and add:
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` (a reference to the database; Railway offers it in the
     variable picker)
   - `ANTHROPIC_API_KEY` = your Anthropic API key. Paste it only here, never in code, chat, or a file in
     the repository. In the Claude Console, create the key for a single workspace. A key that works
     across all workspaces also needs `ANTHROPIC_WORKSPACE_ID` (see below).
4. Under **Settings → Networking**, generate a public domain. Setup and reset links use it automatically.
   If you later use a custom domain, also set `APP_BASE_URL` to it (for example `https://saleslab.omnizant.com`).
5. Optional but recommended: under **Settings → Deploy**, set the health check path to `/healthz`.
6. Deploy. In the deployment's logs, find the block that starts
   `Owner setup link for fred.cohen@omnizant.com`. Open that link, choose your password, and sign in.
   A new link is printed on every start until the owner password is set, and each new one cancels the
   previous one, so always use the most recent link.
7. In Sales Lab, open **Workspace Settings** and use **Test the connection** to confirm the AI key works.
   Then add people from **User Management**: each person gets a private setup link that you send them
   yourself. Sales Lab never emails links and never shows anyone's password.

### Variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Postgres connection string. |
| `ANTHROPIC_API_KEY` | For coaching | Without it, drills run as clearly labeled unscored practice that never counts as scored work. |
| `ANTHROPIC_WORKSPACE_ID` | Only for a multi-workspace key | The workspace coaching requests run in (starts with `wrkspc_`, listed in the Claude Console under workspaces). Not needed for a key created for one workspace. |
| `AI_MODEL` | No | Claude model for coaching. Default `claude-sonnet-5-5`. |
| `AI_TIMEOUT_MS` | No | Longest a coaching request may run once sent. Default `120000`. |
| `AI_MAX_OUTPUT_TOKENS` | No | Longest coaching response the AI may write. Default `8000`. |
| `AI_MAX_CONCURRENT` | No | Coaching requests sent at once; more wait their turn. Default `8`. |
| `AI_QUEUE_WAIT_MS` | No | How long a request may wait for a turn before it fails as busy. Default `300000`. |
| `AI_RUNS_PER_USER_PER_HOUR` | No | Coaching runs one person may start per hour (answers plus retries). Default `60`. |
| `APP_BASE_URL` | No | Public address for links. Defaults to the Railway domain. |
| `OWNER_EMAIL`, `OWNER_NAME` | No | The owner account created on first start. Default Fred Cohen, `fred.cohen@omnizant.com`. |
| `OPENAI_API_KEY` | For voice practice | Turns on Practice Studio-Voice: OpenAI's realtime voice plays the person who answers. Calls are billed by the minute to this OpenAI account (pay as you go). Coaching still uses Anthropic when its key is present. |
| `VOICE_MODEL` | No | The realtime voice model. Default `gpt-realtime-2.1`; `gpt-realtime-2.1-mini` costs about a third as much. |
| `VOICE_MAX_CALL_MINUTES` | No | Each practice call ends at this length. Default `10`. |
| `VOICE_CALLS_PER_DAY` | No | Practice calls one person may make per day (New York time). Default `20`. |
| `AI_PROVIDER` | No | `openai` to coach with OpenAI instead of Anthropic. Anthropic is used when its key is present. |

On Railway the server always runs in production mode: secure cookies, proxy-aware client addresses for
sign-in throttling, and no test-only coaching.

### Sign-in protection

Sign-in pauses after 5 failed attempts for one account from one network address in 15 minutes (100 from
all addresses, or 50 from one address across accounts). Simultaneous guesses count against the same
limit. Someone else's guessing from another address does not lock a person out. A manager can lift a pause
from the person's page in User Management, and a new password from a reset link lifts it too.

### Company logos

The sign-in page and the upper left show the Omnizant and Ravenly logos under the Sales Lab wordmark.
The files are `client/public/brand/omnizant.svg` and `client/public/brand/ravenly.svg`; to change a logo,
replace its file and push. If a file is missing, the company's name shows in its place.

## Knowledge Library: the playbook and product knowledge

Knowledge is kept in **collections** made of **sections**:

- The **Sales Playbook** (both brands) holds sales technique: mindset, openers, discovery, presenting,
  closing, objections, follow-up, language, and practice. Openers, Discovery, Closing, and Objections end
  with field notes from 14 booked Omnizant outbound calls, in `server/seed/sources/field-notes/`.
- **Product knowledge** has one collection per brand. Ravenly's is grouped into Start here, Positioning
  and fit, Product capabilities, Pricing and packaging, Competitive (including the Intaker and Juvo Leads
  battlecards, and the sales team's Ravenly vs Intaker battle card, aligned with the Intaker research),
  Selling Ravenly, and Claims and sources. Omnizant's starts as draft outlines for Web
  development, SEO, and GEO, and adds what the same calls taught: the complimentary website review,
  competitor angles for FindLaw, Justia, Scorpion, and LawLytics, and a draft of company facts the reps
  stated, waiting for a manager to confirm them. **Omnizant AI Search Plans (GEO)** holds the positioning brief for the
  Advantage AI and Max AI plans, one approved section per part of the brief (from
  `server/seed/sources/omnizant-ai-search-plans.md`; the supplied original is in `server/seed/originals/`).
- A **section** is the unit you edit. It has its own text, brand, subjects, buyer personas, evidence
  basis, as-of date, caveats, version history, and approval. Editing a section saves a new version; the
  approved version keeps supporting coaching until the new one is approved. Approving one section never
  changes another.
- Sections are ordered and grouped from **Edit or reorder** on the collection. Order and groups are
  structure, not content, so they change without a new version or approval. A section can be moved to
  another collection from its page.
- **Drills point at the sections they need.** Coaching is grounded only in those sections' approved
  versions, and each section's page lists the drills that use it.
- Reps can **read a whole collection** end to end; managers also see drafts. A long document added with
  **Import a document** can be **split into sections** from its page: each "## " heading becomes a
  section, drills that used the document move to the matching sections, and the document is archived.
  A document with an unapproved draft must be approved first, and a drill section that cannot be matched
  stays listed in the drill editor as no longer available instead of disappearing.

On the first deploy of this version, the supplied Sales Playbook and Ravenly guide are split this way with
their text unchanged, every drill is moved to the same material in its new sections, and the two original
documents stay archived so past answers still show exactly what they were scored against.

## Practice Studio: stages and conversations

- **Reps choose a stage, never a question.** Each stage (Cold outreach, Discovery, Pricing, Renewal, and so
  on) serves one question at random from those written for the rep's role. The question sets the buyer
  persona and the challenge levels, and reps cannot change them. The served question waits until it is
  answered, and a conversation the rep has not finished comes back first, so skipping never leads to an
  easier question. (One whose coaching stopped and was already retried as often as a rep may in an hour
  is set aside until it can be retried, so the stage keeps serving other questions.)
- **Each skill from several angles.** Questions that test the same skill share a **concept**, and each
  concept in the bank has three versions with a different buyer, situation, and challenge level. A stage
  serves the concept the rep has met least, then the version they have answered least, then the buyer
  they have met least on it, preferring questions coaching can score.
- **Filter by product and buyer.** In the Practice Studio, reps and managers can narrow the stages to one
  product (Ravenly, Omnizant AI Search Plans, Omnizant websites and SEO, or sales technique for both
  brands) and one buyer (managing partner, solo attorney, marketing manager, or office manager or intake
  director). Each stage then counts and serves only matching questions. The filters are kept in the link
  and remembered on the device until cleared; an unfinished conversation still comes back first.
- **Try a question again.** The Practice Studio's **Try again** tab lists every question a person has
  answered, one row per question and buyer, with the latest result, the best score, and how many times
  they tried it, sorted by most recent or lowest score and narrowed by the same product and buyer
  filters. **Try again** opens the question with the same buyer and levels as a new conversation; a
  conversation still in progress shows **Continue** instead. Questions since archived drop off the list.
- **Every question is a conversation.** After each reply the coach scores it and writes the buyer's next
  line from what the rep actually said: one pushback at difficulty 1, two at 2, three at 3, and four at 4 or 5,
  so a conversation runs up to five replies.
  The rep reads the coaching, then answers the pushback. When the last reply is coached, the rep sees the
  buyer's closing response, every reply ranked from strongest to weakest, and the conversation's score,
  the average of its replies.
- **Expectations fit the rep's role.** Each question says what a good answer does; questions that happen
  in both jobs add what differs for an account executive (winning new business) and an account manager
  (looking after an existing client). The coach is told which role is answering.
- **The question bank** has 528 questions on 176 concepts, at least 45 per stage, written only
  from approved material: the Sales Playbook with its call field notes, Ravenly product knowledge with the
  Ravenly vs Intaker battle card, the Omnizant AI Search Plans brief, and the Omnizant website review and
  competitor angles (see `server/seed/bank/`, checked by `node server/seed/bank/validate.js`). Each lists
  three follow-up objections the buyer is likely to raise: the coach uses them as a guide, and practice
  without coaching uses them word for word. Questions about Omnizant's websites and SEO practice technique,
  apart from a few on the complimentary website review itself, because only the review and the competitor
  angles are approved; none rely on the unconfirmed "Omnizant at a glance" draft. Managers review, add,
  edit, and delete questions on the **Question Bank** page (below), set a question's product and concept in
  the editor, and can still assign specific questions in Curriculum.
- **Four buyers.** The office manager or intake director joined the managing partner, solo attorney, and
  marketing manager: the person who runs the intake team and the website vendor, books the attorneys'
  time, and recommends but rarely signs. Managers can edit how each buyer is described in Settings.
- **Reports count conversations.** A conversation counts once every planned reply is in and coached and
  every reply's coaching counts: one disputed reply leaves it out, and one waiting for review holds it.
  Unfinished conversations are listed separately, and managers are told about any left for more than a
  day. Critical failures and pending reviews are counted reply by reply, so an unfinished conversation
  never hides them. An assigned exercise is complete when its conversation is.

## Question Bank: questions and ideal answers

- **One page for every question.** Managers find it under **Managing › Question Bank**. Questions are
  grouped by product (Ravenly, Omnizant AI Search Plans, Omnizant websites and SEO, sales technique for
  both brands), then by subject, with counts and how many have an approved ideal answer. Search and
  filters narrow it by stage, buyer, role, status, and ideal answer. Opening a question shows the moment,
  what a good answer does, the buyer's pushbacks, scoring and sources, how many conversations reps have
  had on it, and its ideal answer. **Edit** saves a new version; answers already given keep the version
  they were scored against.
- **Adding a question proposes its ideal answer.** After writing the question, the manager chooses
  **Next: propose the ideal answer**. The AI writes what an excellent rep would say in that moment, from
  the question and its approved source material only, and lists the facts it relies on. The server checks
  each fact: it is marked *Matched to the material* only when its words are in the answer and its quoted
  passage is in the cited source; anything else is marked *Not matched: check it*. The manager edits the
  answer, asks for a new one, or writes their own, then approves it or adds the question and approves the
  answer later. A question with no approved material gets an answer that avoids product facts, with a
  warning. Proposals are limited to 60 per manager per hour, and an incomplete response is asked for once
  more before giving up. Without an AI key, managers write the answer themselves.
- **Only an approved answer is used.** Reps see it after they answer, on the reply's page, never before.
  Coaching gets it as a reference for the first reply: it scores against the criteria and the rubric, not
  by how closely the rep's words match, and builds the stronger example on it. A proposal nobody approved
  is seen only by managers. Changing an approved answer's text needs a new approval; the approval carries
  over only while the text is unchanged. Existing questions can have one proposed from the Question Bank.
- **Deleting is permanent from the page.** A deleted question leaves the Question Bank, the stages, the
  **Try again** list, and the Knowledge Library's "used by" lists, and it can no longer be assigned or
  edited. Answers already given stay in reps' history and reports, an open conversation can be
  finished, and exercises already assigned can still be completed. To hide a question for a while
  instead, set its status to Archived.

## Practice Studio-Voice: practice calls out loud

- **A phone call, not a form.** Reps open **Practice Studio-Voice**, choose what they are selling and,
  if they like, who picks up, and go to a call screen laid out like a softphone. Before dialing they know
  only the product, whether the firm is a new prospect (account executives) or an existing client
  (account managers), and the role of the person who answers. They talk; the person at the firm talks
  back, interrupts, asks questions, and hangs up when the call is over. Managers can make either kind of
  call.
- **The buyer is played from the Question Bank.** Each call takes a question the way the Practice Studio
  does (the concept the rep has met least, preferring questions coaching can score): cold-outreach
  questions for prospects, adoption, value, and renewal questions for clients. Voicemail questions are
  left out. The question's situation, the buyer's main concern, and their pushbacks become the private
  brief of the person who answers, with a made-up name, firm, and a 555-01xx number reserved for fiction.
  The rep never sees the brief until the call ends.
- **How the voice works.** OpenAI's realtime voice (`gpt-realtime-2.1`) plays the person who answers.
  Audio goes directly between the browser and OpenAI over WebRTC. Sales Lab's server only forwards the
  browser's connection offer, with the hidden brief and the server's own key, so neither the key nor the
  brief passes through the browser on the way. Coaching stays on Claude.
- **Coached in writing.** When the call ends, Sales Lab coaches the transcript with the same checks as
  written practice: scores on the question's dimensions plus discovery and advancing, evidence that must
  quote the rep word for word (never the buyer), product claims checked against the approved material,
  and guarantees and invented capabilities flagged. The feedback adds the moments that mattered (what the
  rep said and a better line), whether they booked a next step, and how much of the call each side
  talked. The page then shows what the rep did not know: the situation, the buyer's concerns, and the
  manager's criteria and approved model answer. Practice calls are not held for a manager's review and
  do not count in the dashboard or reports.
- **Costs stay bounded.** Each call ends at 10 minutes, and each person can make 20 calls a day. A call
  left running (a closed laptop) is hung up at OpenAI by the server, and coached from the transcript
  saved along the way. Only one call per person can be live at a time, and a double click never opens a
  second paid session.
- **What is kept.** The transcript (made by speech recognition, so names can come out wrong), the rep's
  notes, and the coaching. No audio is stored. Reps see their own calls; managers see everyone's under
  **Team calls**.

## How coaching stays honest

- Approved sections are the only product facts coaching may rely on. Each drill names the sections it
  is graded against, and each answer keeps the exact versions it was scored with.
- Coaching runs only when the drill has an approved section that matches its brand, subject, and buyer
  persona. Supporting material is also used: sales technique for any drill, and a brand's product and
  competitive sections for each other's drills (a competitor comparison needs the product's own facts).
  Supporting material never stands in for missing facts on the drill's own subject, so drills on topics
  without approved material run as clearly labeled unscored practice.
- Each section records its evidence basis: documented facts, vendors' public claims, untested
  observations, or a mix labeled passage by passage. Coaching flags a claim the rep states as fact when
  the material only reports it as a claim or observation.
- The model's output is checked on the server. Quoted evidence must appear word for word in the rep's
  answer. A critical failure must quote the rep exactly and, for product facts, quote the approved source;
  otherwise it is held as a flag. Critical failures and flags wait for a manager in Team Coaching, who
  confirms or rejects each one, can turn a flag into a critical failure, or add one the coaching missed.
  A confirmed critical failure sets the score to zero. Scores are computed on the server from the rubric in
  force when the answer was submitted.
- Drills that point at "## " sections inside a long document follow them by title when a new version
  renumbers them; sections that were removed or retitled are reported before approval and are not used
  until a manager updates the drill.
- Answers are saved before any AI request. If the model's response comes back incomplete (cut off, or
  missing a required part), coaching asks once more on its own before giving up. If coaching still fails,
  times out, or is interrupted, the answer is kept, no score is recorded, and the rep can retry without
  retyping; managers see the technical cause on the reply's page. In a conversation the buyer pushes
  back only after the last reply has been coached.
- In a conversation, each reply is judged on its own, as an answer to the buyer's latest words, with the
  earlier turns as context. Evidence quotes come only from that reply.
- Disputed evaluations and unresolved flagged ones are left out of averages. Strengths and weaknesses need
  at least three scored first attempts. Unscored practice never uses up a rep's first attempt, and answers
  count under the role the person had when they wrote them.
- Retry gains count only retries at the same or harder settings, and the trend reports the change on
  comparable drills alongside any shift in challenge level or subject mix.

## Local development

Requires Node 22 and a local Postgres.

```sh
npm install
cp .env.example .env          # then edit DATABASE_URL and, optionally, ANTHROPIC_API_KEY
npm run build && npm start    # http://localhost:3000; the owner setup link is printed in the console
```

For live reload, run `npm run dev:server` and `npm run dev:client` (the client at http://localhost:5173
proxies the API). `npm run owner-link` prints a fresh owner link at any time.

## Tests

```sh
npm test            # unit and integration tests (needs Postgres at postgres://postgres@127.0.0.1:5432)
npm run test:e2e    # browser tests of the full manager and rep journey (needs a Chromium for Playwright)
```

Automated tests use test-only stand-ins for the AI service and the realtime voice that cannot be enabled in
production. In browser tests the stand-in voice speaks scripted lines and the rep types what they would say.

## Status

Implemented and covered by automated tests (158 server tests and 26 browser tests): company email and
password sign-in with manager-created accounts only, private single-use setup and reset links, sign-in
throttling, deactivation and session revocation, server-side roles and learner privacy, the knowledge
library as collections of sections with versions, approval, evidence basis, ordering, and document
splitting, drills with relevance checks, the Practice Studio with stages that serve questions at random
and rotate through concepts, product and buyer filters, trying an answered question again, practice
conversations with per-reply coaching
and buyer pushbacks, role-specific expectations, retries,
and a coaching queue, Team Coaching with per-item review of critical failures and
flags, Curriculum assignments and learning paths, the Manager Dashboard and rep reports with CSV export,
and recovery from failed, stuck, or queued coaching. The code was also reviewed independently for security
and against the specification, and the findings were fixed and re-checked.

Needs verification or material:

- Real coaching has only been exercised with the test stand-in. After adding the API key, run a few
  conversations and review the first evaluations and pushbacks in Team Coaching to calibrate the rubric and
  targets.
- Omnizant product material so far is the AI Search Plans positioning brief (story and language, but no
  prices, quantities, or deliverable lists) and what 14 booked calls taught (the website review offer and
  competitor angles). The company and service facts reps stated on those calls are a draft until a manager
  confirms them, and the outlines for Web development, SEO, and GEO are still to be written. So questions
  about Omnizant's websites and SEO practice technique (apart from the website review itself), while AI
  Search Plans questions are scored against the brief. Sales-technique questions apply to both brands.
- Out of scope for this version: voice, full-call simulation, CRM integrations, automated emails or
  reminders, and imports beyond pasted text, `.txt`, and `.md`.
