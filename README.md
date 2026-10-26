# Sales Lab

Practice, coaching, and reporting for the shared Omnizant and Ravenly sales team. Reps choose a stage of
the sale, answer the buyer's question in writing, get AI coaching grounded in approved source material, and
then answer the buyer's pushbacks, one objection after another. Managers assign ordered practice, review
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
| `AI_TIMEOUT_MS` | No | Longest a coaching request may run once sent. Default `90000`. |
| `AI_MAX_CONCURRENT` | No | Coaching requests sent at once; more wait their turn. Default `8`. |
| `AI_QUEUE_WAIT_MS` | No | How long a request may wait for a turn before it fails as busy. Default `300000`. |
| `AI_RUNS_PER_USER_PER_HOUR` | No | Coaching runs one person may start per hour (answers plus retries). Default `60`. |
| `APP_BASE_URL` | No | Public address for links. Defaults to the Railway domain. |
| `OWNER_EMAIL`, `OWNER_NAME` | No | The owner account created on first start. Default Fred Cohen, `fred.cohen@omnizant.com`. |
| `OPENAI_API_KEY`, `AI_PROVIDER` | No | An alternative provider. Anthropic is used when its key is present. |

On Railway the server always runs in production mode: secure cookies, proxy-aware client addresses for
sign-in throttling, and no test-only coaching.

### Sign-in protection

Sign-in pauses after 5 failed attempts for one account from one network address in 15 minutes (100 from
all addresses, or 50 from one address across accounts). Simultaneous guesses count against the same
limit. Someone else's guessing from another address does not lock a person out. A manager can lift a pause
from the person's page in User Management, and a new password from a reset link lifts it too.

### Company logos

The sign-in page and the upper left show small Omnizant and Ravenly marks next to the Sales Lab logo.
Until logo files are added they appear as text. To use the real logos, add `omnizant.svg` (or `.png`) and
`ravenly.svg` (or `.png`) to `client/public/brand/` and push. A wide, transparent logo works best; it is
shown 12 pixels tall.

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
  on) serves one question at random from those written for the rep's role, preferring questions the rep
  has not answered and ones coaching can score. The question sets the buyer persona and the challenge
  levels, and reps cannot change them. The served question waits until it is answered, and a conversation
  the rep has not finished comes back first, so skipping never leads to an easier question. (One whose
  coaching stopped and was already retried as often as a rep may in an hour is set aside until it can be
  retried, so the stage keeps serving other questions.)
- **Every question is a conversation.** After each reply the coach scores it and writes the buyer's next
  line from what the rep actually said: one pushback at difficulty 1 or 2, two at 3, and three at 4 or 5.
  The rep reads the coaching, then answers the pushback. When the last reply is coached, the rep sees the
  buyer's closing response, every reply ranked from strongest to weakest, and the conversation's score,
  the average of its replies.
- **Expectations fit the rep's role.** Each question says what a good answer does; questions that happen
  in both jobs add what differs for an account executive (winning new business) and an account manager
  (looking after an existing client). The coach is told which role is answering.
- **The question bank** has at least 12 questions per stage, written only from the approved Sales Playbook
  and Ravenly product knowledge (see `server/seed/bank/`, checked by `node server/seed/bank/validate.js`).
  Each lists three follow-up objections the buyer is likely to raise: the coach uses them as a guide, and
  practice without coaching uses them word for word. Omnizant questions practice technique only; none
  cite the AI Search Plans brief yet. Managers browse and edit every question under **Question
  bank** in the Practice Studio, and can still assign specific questions in Curriculum.
- **Reports count conversations.** A conversation counts once every planned reply is in and coached and
  every reply's coaching counts: one disputed reply leaves it out, and one waiting for review holds it.
  Unfinished conversations are listed separately, and managers are told about any left for more than a
  day. Critical failures and pending reviews are counted reply by reply, so an unfinished conversation
  never hides them. An assigned exercise is complete when its conversation is.

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
- Answers are saved before any AI request. If coaching fails, times out, or is interrupted, the answer is
  kept, no score is recorded, and the rep can retry without retyping. In a conversation the buyer pushes
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

Automated tests use a test-only stand-in for the AI service that cannot be enabled in production.

## Status

Implemented and covered by automated tests (148 server tests and 24 browser tests): company email and
password sign-in with manager-created accounts only, private single-use setup and reset links, sign-in
throttling, deactivation and session revocation, server-side roles and learner privacy, the knowledge
library as collections of sections with versions, approval, evidence basis, ordering, and document
splitting, drills with relevance checks, the Practice Studio with stages that serve questions at random,
practice conversations with per-reply coaching and buyer pushbacks, role-specific expectations, retries,
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
  confirms them, the outlines for Web development, SEO, and GEO are still to be written, and there are no
  Omnizant product drills yet. Sales-technique drills apply to both brands.
- Company logo files have not been added (see above).
- Out of scope for this version: voice, full-call simulation, CRM integrations, automated emails or
  reminders, and imports beyond pasted text, `.txt`, and `.md`.
