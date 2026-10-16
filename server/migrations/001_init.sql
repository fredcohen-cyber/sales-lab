-- Sales Lab initial schema.
CREATE EXTENSION IF NOT EXISTS citext;

-- ---------------------------------------------------------------- people & access
CREATE TABLE users (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email           citext NOT NULL UNIQUE,
  name            text NOT NULL,
  role            text NOT NULL CHECK (role IN ('ae', 'am', 'manager')),
  experience      text NOT NULL DEFAULT 'new_hire' CHECK (experience IN ('new_hire', 'experienced')),
  is_owner        boolean NOT NULL DEFAULT false,
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deactivated')),
  password_hash   text,
  password_set_at timestamptz,
  last_login_at   timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid REFERENCES users(id),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deactivated_at  timestamptz,
  deactivated_by  uuid REFERENCES users(id)
);
CREATE UNIQUE INDEX users_single_owner ON users ((true)) WHERE is_owner;

CREATE TABLE sessions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES users(id),
  token_hash     text NOT NULL UNIQUE,
  created_at     timestamptz NOT NULL DEFAULT now(),
  last_seen_at   timestamptz NOT NULL DEFAULT now(),
  expires_at     timestamptz NOT NULL,
  revoked_at     timestamptz,
  revoked_reason text,
  ip             text,
  user_agent     text
);
CREATE INDEX sessions_user_active ON sessions (user_id) WHERE revoked_at IS NULL;

CREATE TABLE password_links (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES users(id),
  purpose        text NOT NULL CHECK (purpose IN ('setup', 'reset')),
  token_hash     text NOT NULL UNIQUE,
  created_by     uuid REFERENCES users(id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  expires_at     timestamptz NOT NULL,
  used_at        timestamptz,
  revoked_at     timestamptz,
  revoked_reason text
);
CREATE INDEX password_links_user ON password_links (user_id, created_at DESC);

CREATE TABLE login_attempts (
  id         bigserial PRIMARY KEY,
  email      citext,
  ip         text,
  success    boolean NOT NULL,
  reason     text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX login_attempts_email ON login_attempts (email, created_at DESC);
CREATE INDEX login_attempts_ip ON login_attempts (ip, created_at DESC);

CREATE TABLE audit_events (
  id             bigserial PRIMARY KEY,
  actor_id       uuid REFERENCES users(id),
  action         text NOT NULL,
  target_user_id uuid REFERENCES users(id),
  entity_type    text,
  entity_id      text,
  details        jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip             text,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_target ON audit_events (target_user_id, created_at DESC);
CREATE INDEX audit_created ON audit_events (created_at DESC);

-- ---------------------------------------------------------------- workspace
CREATE TABLE rubric_versions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version    int NOT NULL UNIQUE,
  dimensions jsonb NOT NULL,
  note       text NOT NULL DEFAULT '',
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE workspace_settings (
  id                    int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  current_rubric_id     uuid REFERENCES rubric_versions(id),
  proficiency_threshold int NOT NULL DEFAULT 70 CHECK (proficiency_threshold BETWEEN 1 AND 100),
  strength_threshold    int NOT NULL DEFAULT 80 CHECK (strength_threshold BETWEEN 1 AND 100),
  weakness_threshold    int NOT NULL DEFAULT 65 CHECK (weakness_threshold BETWEEN 1 AND 100),
  min_evidence          int NOT NULL DEFAULT 3 CHECK (min_evidence >= 3),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  updated_by            uuid REFERENCES users(id)
);

CREATE TABLE personas (
  key              text PRIMARY KEY,
  label            text NOT NULL,
  responsibilities text NOT NULL,
  concerns         text NOT NULL,
  position         int NOT NULL DEFAULT 0,
  updated_at       timestamptz NOT NULL DEFAULT now(),
  updated_by       uuid REFERENCES users(id)
);

-- ---------------------------------------------------------------- knowledge library
CREATE TABLE knowledge_sources (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                text UNIQUE,
  status              text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'archived')),
  approved_version_id uuid,
  latest_version_id   uuid,
  created_by          uuid REFERENCES users(id),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  archived_at         timestamptz,
  archived_by         uuid REFERENCES users(id)
);

CREATE TABLE knowledge_versions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id   uuid NOT NULL REFERENCES knowledge_sources(id),
  version     int NOT NULL,
  title       text NOT NULL,
  brand       text NOT NULL CHECK (brand IN ('omnizant', 'ravenly', 'both')),
  subjects    text[] NOT NULL,
  personas    text[] NOT NULL DEFAULT '{}',
  as_of_date  date,
  caveats     text NOT NULL DEFAULT '',
  content     text NOT NULL,
  change_note text NOT NULL DEFAULT '',
  created_by  uuid REFERENCES users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  approved_by uuid REFERENCES users(id),
  UNIQUE (source_id, version)
);
ALTER TABLE knowledge_sources
  ADD CONSTRAINT knowledge_sources_approved_fk FOREIGN KEY (approved_version_id) REFERENCES knowledge_versions(id),
  ADD CONSTRAINT knowledge_sources_latest_fk FOREIGN KEY (latest_version_id) REFERENCES knowledge_versions(id);

-- Versions are immutable once written: content and metadata never change in place.
CREATE FUNCTION forbid_version_content_change() RETURNS trigger AS $$
BEGIN
  IF NEW.content IS DISTINCT FROM OLD.content
     OR NEW.title IS DISTINCT FROM OLD.title
     OR NEW.brand IS DISTINCT FROM OLD.brand
     OR NEW.subjects IS DISTINCT FROM OLD.subjects
     OR NEW.personas IS DISTINCT FROM OLD.personas
     OR NEW.as_of_date IS DISTINCT FROM OLD.as_of_date
     OR NEW.caveats IS DISTINCT FROM OLD.caveats THEN
    RAISE EXCEPTION 'knowledge versions are immutable; create a new version instead';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER knowledge_versions_immutable BEFORE UPDATE ON knowledge_versions
  FOR EACH ROW EXECUTE FUNCTION forbid_version_content_change();

-- ---------------------------------------------------------------- drills
CREATE TABLE drills (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug               text UNIQUE,
  status             text NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived')),
  current_version_id uuid,
  created_by         uuid REFERENCES users(id),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE drill_versions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drill_id            uuid NOT NULL REFERENCES drills(id),
  version             int NOT NULL,
  title               text NOT NULL,
  brand               text NOT NULL CHECK (brand IN ('omnizant', 'ravenly', 'both')),
  subject             text NOT NULL CHECK (subject IN ('sales_technique', 'product', 'competitive')),
  stage               text NOT NULL,
  roles               text[] NOT NULL,
  personas            text[] NOT NULL,
  situation           text NOT NULL,
  buyer_line          text NOT NULL,
  persona_lines       jsonb NOT NULL DEFAULT '{}'::jsonb,
  objective           text NOT NULL,
  good_looks_like     text NOT NULL,
  assessed_dimensions text[] NOT NULL,
  default_difficulty  int NOT NULL DEFAULT 3 CHECK (default_difficulty BETWEEN 1 AND 5),
  default_skepticism  int NOT NULL DEFAULT 3 CHECK (default_skepticism BETWEEN 1 AND 5),
  default_depth       int NOT NULL DEFAULT 3 CHECK (default_depth BETWEEN 1 AND 5),
  source_refs         jsonb NOT NULL DEFAULT '[]'::jsonb,
  change_note         text NOT NULL DEFAULT '',
  created_by          uuid REFERENCES users(id),
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (drill_id, version)
);
ALTER TABLE drills ADD CONSTRAINT drills_current_fk FOREIGN KEY (current_version_id) REFERENCES drill_versions(id);

-- ---------------------------------------------------------------- curriculum
CREATE TABLE learning_paths (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text UNIQUE,
  name        text NOT NULL,
  description text NOT NULL DEFAULT '',
  audience    text NOT NULL DEFAULT 'all',
  items       jsonb NOT NULL DEFAULT '[]'::jsonb,
  status      text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_by  uuid REFERENCES users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE assignments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id       uuid NOT NULL REFERENCES users(id),
  title            text NOT NULL,
  note             text NOT NULL DEFAULT '',
  path_id          uuid REFERENCES learning_paths(id),
  kind             text NOT NULL DEFAULT 'curriculum' CHECK (kind IN ('curriculum', 'targeted')),
  target_dimension text,
  due_date         date,
  status           text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  assigned_by      uuid NOT NULL REFERENCES users(id),
  assigned_at      timestamptz NOT NULL DEFAULT now(),
  completed_at     timestamptz,
  cancelled_at     timestamptz,
  cancelled_by     uuid REFERENCES users(id),
  cancel_reason    text
);
CREATE INDEX assignments_learner ON assignments (learner_id, status);

CREATE TABLE assignment_items (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id        uuid NOT NULL REFERENCES assignments(id),
  position             int NOT NULL,
  drill_id             uuid NOT NULL REFERENCES drills(id),
  drill_version_id     uuid NOT NULL REFERENCES drill_versions(id),
  persona              text NOT NULL,
  difficulty           int NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
  skepticism           int NOT NULL CHECK (skepticism BETWEEN 1 AND 5),
  depth                int NOT NULL CHECK (depth BETWEEN 1 AND 5),
  completed_at         timestamptz,
  completed_attempt_id uuid,
  UNIQUE (assignment_id, position)
);

-- ---------------------------------------------------------------- practice & coaching
CREATE TABLE attempts (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id         uuid NOT NULL REFERENCES users(id),
  learner_role       text NOT NULL,
  drill_id           uuid NOT NULL REFERENCES drills(id),
  drill_version_id   uuid NOT NULL REFERENCES drill_versions(id),
  persona            text NOT NULL,
  difficulty         int NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
  skepticism         int NOT NULL CHECK (skepticism BETWEEN 1 AND 5),
  depth              int NOT NULL CHECK (depth BETWEEN 1 AND 5),
  brand              text NOT NULL,
  stage              text NOT NULL,
  assignment_item_id uuid REFERENCES assignment_items(id),
  mode               text NOT NULL CHECK (mode IN ('coached', 'unscored')),
  unscored_reason    text,
  attempt_number     int NOT NULL CHECK (attempt_number >= 1),
  scenario           jsonb NOT NULL,
  rubric_version_id  uuid REFERENCES rubric_versions(id),
  source_versions    jsonb NOT NULL DEFAULT '[]'::jsonb,
  answer             text NOT NULL,
  client_request_id  uuid NOT NULL,
  submitted_at       timestamptz NOT NULL DEFAULT now(),
  latest_run_id      uuid,
  evaluation_id      uuid,
  UNIQUE (learner_id, client_request_id),
  UNIQUE (learner_id, drill_id, persona, attempt_number)
);
CREATE INDEX attempts_learner_time ON attempts (learner_id, submitted_at DESC);
CREATE INDEX attempts_time ON attempts (submitted_at DESC);
ALTER TABLE assignment_items
  ADD CONSTRAINT assignment_items_attempt_fk FOREIGN KEY (completed_attempt_id) REFERENCES attempts(id);

CREATE TABLE evaluation_runs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id     uuid NOT NULL REFERENCES attempts(id),
  run_number     int NOT NULL,
  status         text NOT NULL CHECK (status IN ('running', 'succeeded', 'failed', 'timed_out', 'superseded')),
  requested_by   uuid REFERENCES users(id),
  provider       text,
  model          text,
  prompt_version text,
  started_at     timestamptz NOT NULL DEFAULT now(),
  deadline_at    timestamptz NOT NULL,
  finished_at    timestamptz,
  error_code     text,
  error_message  text,
  UNIQUE (attempt_id, run_number)
);
CREATE INDEX evaluation_runs_running ON evaluation_runs (deadline_at) WHERE status = 'running';
ALTER TABLE attempts ADD CONSTRAINT attempts_latest_run_fk FOREIGN KEY (latest_run_id) REFERENCES evaluation_runs(id);

CREATE TABLE evaluations (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id         uuid NOT NULL UNIQUE REFERENCES attempts(id),
  run_id             uuid NOT NULL UNIQUE REFERENCES evaluation_runs(id),
  rubric_version_id  uuid REFERENCES rubric_versions(id),
  weighted_score     int CHECK (weighted_score BETWEEN 0 AND 100),
  overall_score      int CHECK (overall_score BETWEEN 0 AND 100),
  dimension_scores   jsonb NOT NULL,
  critical_failures  jsonb NOT NULL DEFAULT '[]'::jsonb,
  review_flags       jsonb NOT NULL DEFAULT '[]'::jsonb,
  feedback           jsonb NOT NULL,
  verification_notes jsonb NOT NULL DEFAULT '[]'::jsonb,
  review_status      text NOT NULL CHECK (review_status IN ('final', 'provisional', 'confirmed', 'disputed')),
  meets_target       boolean NOT NULL DEFAULT false,
  proficiency_threshold int NOT NULL,
  raw_output         jsonb,
  created_at         timestamptz NOT NULL DEFAULT now(),
  reviewed_by        uuid REFERENCES users(id),
  reviewed_at        timestamptz,
  review_note        text
);
ALTER TABLE attempts ADD CONSTRAINT attempts_evaluation_fk FOREIGN KEY (evaluation_id) REFERENCES evaluations(id);

CREATE TABLE coaching_notes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES attempts(id),
  author_id  uuid NOT NULL REFERENCES users(id),
  body       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX coaching_notes_attempt ON coaching_notes (attempt_id, created_at);

-- ---------------------------------------------------------------- bookkeeping
CREATE TABLE seed_runs (
  key        text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);
