-- 003: coaching queue timing, disputed evaluations set aside, drills remember which source version
-- their sections were chosen from.

-- When the AI request actually started (after waiting for a free slot). NULL while queued.
ALTER TABLE evaluation_runs ADD COLUMN call_started_at timestamptz;
UPDATE evaluation_runs SET call_started_at = started_at WHERE status <> 'running';

-- Disputing sets an evaluation aside as a whole: undecided items are no longer "waiting for review".
UPDATE evaluations e
   SET critical_failures = COALESCE((
         SELECT jsonb_agg(CASE WHEN cf->>'status' = 'pending' THEN cf || '{"status": "set_aside"}'::jsonb ELSE cf END ORDER BY ord)
           FROM jsonb_array_elements(e.critical_failures) WITH ORDINALITY AS t(cf, ord)), '[]'::jsonb),
       review_flags = COALESCE((
         SELECT jsonb_agg(CASE WHEN f->>'status' = 'open' THEN f || '{"status": "set_aside"}'::jsonb ELSE f END ORDER BY ord)
           FROM jsonb_array_elements(e.review_flags) WITH ORDINALITY AS t(f, ord)), '[]'::jsonb)
 WHERE e.review_status = 'disputed';

-- Each drill source reference records the version its sections were chosen from, so a later version
-- that renumbers sections is matched by section title instead of silently pointing elsewhere.
UPDATE drill_versions dv
   SET source_refs = COALESCE((
         SELECT jsonb_agg(
                  CASE WHEN r ? 'versionId' THEN r
                       ELSE r || jsonb_build_object('versionId', COALESCE(s.approved_version_id, s.latest_version_id)) END
                  ORDER BY ord)
           FROM jsonb_array_elements(dv.source_refs) WITH ORDINALITY AS t(r, ord)
           LEFT JOIN knowledge_sources s ON s.id::text = r->>'sourceId'), '[]'::jsonb)
 WHERE jsonb_array_length(dv.source_refs) > 0;
