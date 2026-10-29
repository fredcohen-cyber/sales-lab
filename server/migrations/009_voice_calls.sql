-- Practice Studio-Voice: practice phone calls. The rep knows only what they sell and who picks up; the
-- person who answers is played by a realtime voice model from a question in the bank, which stays hidden
-- until the call ends. The transcript is coached in writing. No audio is stored.
CREATE TABLE IF NOT EXISTS voice_calls (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id        uuid NOT NULL REFERENCES users(id),
  learner_role      text NOT NULL,
  call_type         text NOT NULL CHECK (call_type IN ('prospect', 'client')),
  brand             text NOT NULL,
  product_line      text NOT NULL,
  persona           text NOT NULL,
  drill_id          uuid NOT NULL REFERENCES drills(id),
  drill_version_id  uuid NOT NULL REFERENCES drill_versions(id),
  -- The hidden brief the voice model played, frozen when the call was set up.
  scenario          jsonb NOT NULL,
  rubric_version_id uuid REFERENCES rubric_versions(id),
  source_versions   jsonb NOT NULL DEFAULT '[]'::jsonb,
  voice_model       text NOT NULL,
  voice             text NOT NULL,
  status            text NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'live', 'ended', 'failed', 'abandoned')),
  openai_call_id    text,
  connect_error     text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  connected_at      timestamptz,
  ended_at          timestamptz,
  end_reason        text,
  duration_ms       int,
  talk              jsonb NOT NULL DEFAULT '{}'::jsonb,
  transcript        jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes             text NOT NULL DEFAULT '',
  coaching_status   text NOT NULL DEFAULT 'none' CHECK (coaching_status IN ('none', 'running', 'done', 'failed', 'skipped')),
  coaching_started_at timestamptz,
  coaching_error    text,
  coaching_detail   text,
  evaluation        jsonb,
  score             int CHECK (score BETWEEN 0 AND 100),
  model             text,
  prompt_version    text
);
CREATE INDEX IF NOT EXISTS voice_calls_learner_time ON voice_calls (learner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS voice_calls_time ON voice_calls (created_at DESC);
CREATE INDEX IF NOT EXISTS voice_calls_open ON voice_calls (status) WHERE status IN ('ready', 'live');
