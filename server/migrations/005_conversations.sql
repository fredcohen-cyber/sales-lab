-- Practice conversations and the stage feed.
--
-- A practice answer is now one turn of a conversation: the rep replies, the reply is coached, and the
-- buyer pushes back (1 to 3 times, by difficulty) until the planned replies are done. Every reply is an
-- attempt row with its own coaching, so reviews, flags, and retries work per reply. The first reply's
-- id is the conversation's id; later replies share its attempt number and are not separate attempts.
ALTER TABLE attempts
  ADD COLUMN conversation_id uuid,
  ADD COLUMN turn_number int NOT NULL DEFAULT 1 CHECK (turn_number >= 1),
  ADD COLUMN replies_planned int NOT NULL DEFAULT 1 CHECK (replies_planned BETWEEN 1 AND 6);
UPDATE attempts SET conversation_id = id;
ALTER TABLE attempts ALTER COLUMN conversation_id SET NOT NULL;
ALTER TABLE attempts
  ADD CONSTRAINT attempts_conversation_fk FOREIGN KEY (conversation_id) REFERENCES attempts(id),
  ADD CONSTRAINT attempts_conversation_turn UNIQUE (conversation_id, turn_number),
  ADD CONSTRAINT attempts_turn_within_plan CHECK (turn_number <= replies_planned),
  ADD CONSTRAINT attempts_first_turn_starts_conversation CHECK ((turn_number = 1) = (conversation_id = id));

-- Numbering counts conversations, so only first replies are numbered uniquely.
ALTER TABLE attempts DROP CONSTRAINT attempts_learner_id_drill_id_persona_attempt_number_key;
CREATE UNIQUE INDEX attempts_number ON attempts (learner_id, drill_id, persona, attempt_number) WHERE turn_number = 1;
ALTER TABLE attempts DROP CONSTRAINT attempts_coached_number_mode;
ALTER TABLE attempts ADD CONSTRAINT attempts_coached_number_mode
  CHECK (CASE WHEN turn_number = 1 THEN (mode = 'coached') = (coached_number IS NOT NULL) ELSE coached_number IS NULL END);

-- What a good answer does for each rep role ({"ae": "...", "am": "..."}), added to the shared criteria,
-- and the follow-up objections the buyer is likely to raise, in order.
ALTER TABLE drill_versions
  ADD COLUMN role_guidance jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN pushbacks jsonb NOT NULL DEFAULT '[]'::jsonb;

-- The question each rep was served in each stage. It waits until they answer it, so a rep cannot skip
-- questions until an easier one comes up.
CREATE TABLE practice_draws (
  learner_id uuid NOT NULL REFERENCES users(id),
  stage      text NOT NULL,
  drill_id   uuid NOT NULL REFERENCES drills(id),
  persona    text NOT NULL,
  drawn_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (learner_id, stage)
);
