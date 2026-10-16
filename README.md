# Sales Lab

Practice, coaching, and reporting for the shared Omnizant and Ravenly sales team. Reps answer one buyer
moment at a time in writing, get AI coaching grounded in approved source material, and retry. Managers
assign ordered practice, review evaluations, and follow performance and engagement. Scores are for coaching
and development only, not employment decisions or rankings.

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
     the repository.
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

## How coaching stays honest

- Approved knowledge sources are the only product facts coaching may rely on. Each drill names the
  sources and sections it is graded against, and each answer keeps the exact versions it was scored with.
- Coaching runs only when the drill has an approved source that matches its brand, subject, and buyer
  persona. Sales-technique material can support a product drill but never stands in for missing product
  facts, so drills on topics without approved material run as clearly labeled unscored practice.
- Each source records its evidence basis: documented facts, vendors' public claims, untested
  observations, or a mix labeled passage by passage. Coaching flags a claim the rep states as fact when
  the material only reports it as a claim or observation.
- The model's output is checked on the server. Quoted evidence must appear word for word in the rep's
  answer. A critical failure must quote the rep exactly and, for product facts, quote the approved source;
  otherwise it is held as a flag. Critical failures and flags wait for a manager in Team Coaching, who
  confirms or rejects each one, can turn a flag into a critical failure, or add one the coaching missed.
  A confirmed critical failure sets the score to zero. Scores are computed on the server from the rubric in
  force when the answer was submitted.
- Drills point at sections of a source. When a new version renumbers sections, drills follow them by title;
  sections that were removed or retitled are reported before approval and are not used until a manager
  updates the drill.
- Answers are saved before any AI request. If coaching fails, times out, or is interrupted, the answer is
  kept, no score is recorded, and the rep can retry without retyping.
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

Implemented and covered by automated tests (97 server tests and 15 browser tests): company email and
password sign-in with manager-created accounts only, private single-use setup and reset links, sign-in
throttling, deactivation and session revocation, server-side roles and learner privacy, the knowledge
library with versions, approval, and evidence basis, drills with relevance checks, the Practice Studio
with coaching, retries, and a coaching queue, Team Coaching with per-item review of critical failures and
flags, Curriculum assignments and learning paths, the Manager Dashboard and rep reports with CSV export,
and recovery from failed, stuck, or queued coaching. The code was also reviewed independently for security
and against the specification, and the findings were fixed and re-checked.

Needs verification or material:

- Real coaching has only been exercised with the test stand-in. After adding the API key, run a few drills
  and review the first evaluations in Team Coaching to calibrate the rubric and targets.
- No Omnizant product or competitive material has been supplied, so there are no Omnizant product drills
  and the Knowledge Library shows that gap. Sales-technique drills apply to both brands.
- Company logo files have not been added (see above).
- Out of scope for this version: voice, full-call or multi-turn simulation, CRM integrations, automated
  emails or reminders, and imports beyond pasted text, `.txt`, and `.md`.
