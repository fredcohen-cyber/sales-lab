-- Each question version can carry an ideal answer: proposed by the AI from the approved material, and
-- counted only once a manager approves it. Approved answers are shown to reps after they answer and given
-- to coaching as a reference.
ALTER TABLE drill_versions
  ADD COLUMN IF NOT EXISTS ideal_answer text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS ideal_answer_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS ideal_answer_review jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'drill_versions_ideal_answer_status_check') THEN
    ALTER TABLE drill_versions ADD CONSTRAINT drill_versions_ideal_answer_status_check
      CHECK (ideal_answer_status IN ('none', 'proposed', 'approved'));
  END IF;
END $$;

-- Deleting a question removes it from the bank and from practice for good. The row stays, so answers
-- reps already gave keep their history, and the bank's seed never brings the question back.
ALTER TABLE drills DROP CONSTRAINT IF EXISTS drills_status_check;
ALTER TABLE drills ADD CONSTRAINT drills_status_check CHECK (status IN ('draft', 'active', 'archived', 'deleted'));
ALTER TABLE drills
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES users(id);
