-- 002: sign-in attempt outcomes, scored-attempt numbering, evidence basis for sources,
-- per-item manager review of critical failures and flags.

-- ---------------------------------------------------------------- sign-in throttling
-- Each attempt is written before the password check ("pending") so parallel guesses are counted,
-- and requests turned away by the throttle ("blocked") never count as failures.
ALTER TABLE login_attempts ADD COLUMN outcome text;
UPDATE login_attempts
   SET outcome = CASE WHEN success THEN 'success' WHEN reason = 'throttled' THEN 'blocked' ELSE 'failure' END;
ALTER TABLE login_attempts ALTER COLUMN outcome SET NOT NULL;
ALTER TABLE login_attempts ADD CONSTRAINT login_attempts_outcome_check
  CHECK (outcome IN ('pending', 'success', 'failure', 'blocked'));
ALTER TABLE login_attempts DROP COLUMN success;
ALTER TABLE login_attempts ADD COLUMN kind text NOT NULL DEFAULT 'login'
  CHECK (kind IN ('login', 'password_change'));
-- Set when a manager allows sign-in again or the person sets a new password from a link.
ALTER TABLE login_attempts ADD COLUMN cleared_at timestamptz;
CREATE INDEX login_attempts_email_ip ON login_attempts (email, ip, created_at DESC);

-- ---------------------------------------------------------------- scored-attempt numbering
-- coached_number counts coached submissions only, so unscored practice never uses up the first attempt.
ALTER TABLE attempts ADD COLUMN coached_number int CHECK (coached_number >= 1);
UPDATE attempts a
   SET coached_number = n.rn
  FROM (SELECT id, row_number() OVER (PARTITION BY learner_id, drill_id, persona ORDER BY attempt_number) AS rn
          FROM attempts WHERE mode = 'coached') n
 WHERE a.id = n.id;
ALTER TABLE attempts ADD CONSTRAINT attempts_coached_number_mode CHECK ((mode = 'coached') = (coached_number IS NOT NULL));
CREATE UNIQUE INDEX attempts_coached_number ON attempts (learner_id, drill_id, persona, coached_number)
  WHERE coached_number IS NOT NULL;
CREATE INDEX attempts_role_time ON attempts (learner_role, submitted_at DESC);

-- ---------------------------------------------------------------- evidence basis
-- What kind of evidence a source version holds: documented facts and approved guidance, vendors'
-- public claims, untested observations, or a mix labeled passage by passage.
ALTER TABLE knowledge_versions ADD COLUMN evidence_basis text NOT NULL DEFAULT 'documented'
  CHECK (evidence_basis IN ('documented', 'public_claims', 'observed', 'mixed'));
UPDATE knowledge_versions v SET evidence_basis = 'mixed'
  FROM knowledge_sources s
 WHERE s.id = v.source_id AND s.slug = 'ravenly-sales-training';

CREATE OR REPLACE FUNCTION forbid_version_content_change() RETURNS trigger AS $$
BEGIN
  IF NEW.content IS DISTINCT FROM OLD.content
     OR NEW.title IS DISTINCT FROM OLD.title
     OR NEW.brand IS DISTINCT FROM OLD.brand
     OR NEW.subjects IS DISTINCT FROM OLD.subjects
     OR NEW.personas IS DISTINCT FROM OLD.personas
     OR NEW.as_of_date IS DISTINCT FROM OLD.as_of_date
     OR NEW.caveats IS DISTINCT FROM OLD.caveats
     OR NEW.evidence_basis IS DISTINCT FROM OLD.evidence_basis THEN
    RAISE EXCEPTION 'knowledge versions are immutable; create a new version instead';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------- manager review
-- Critical failures and flags now carry ids and their own review status. While a critical failure is
-- pending, the overall score is unknown (NULL): it becomes 0 if a manager confirms it.
ALTER TABLE evaluations ADD COLUMN review_history jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE evaluations e
   SET critical_failures = COALESCE((
         SELECT jsonb_agg(cf || jsonb_build_object(
                  'id', 'cf' || ord,
                  'origin', 'coach',
                  'status', CASE WHEN e.review_status = 'confirmed' THEN 'confirmed' ELSE 'pending' END)
                ORDER BY ord)
           FROM jsonb_array_elements(e.critical_failures) WITH ORDINALITY AS t(cf, ord)), '[]'::jsonb),
       review_flags = COALESCE((
         SELECT jsonb_agg(f || jsonb_build_object(
                  'id', 'f' || ord,
                  'status', CASE WHEN e.review_status = 'confirmed' THEN 'dismissed' ELSE 'open' END)
                ORDER BY ord)
           FROM jsonb_array_elements(e.review_flags) WITH ORDINALITY AS t(f, ord)), '[]'::jsonb);

UPDATE evaluations
   SET overall_score = NULL, meets_target = false
 WHERE review_status IN ('provisional', 'disputed')
   AND jsonb_array_length(critical_failures) > 0;
