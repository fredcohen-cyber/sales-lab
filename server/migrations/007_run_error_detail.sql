-- Why a coaching run failed, in technical terms (for example "response cut off at max_tokens"), so a
-- manager can see the cause on the answer page. Reps see only the plain error message.
ALTER TABLE evaluation_runs ADD COLUMN IF NOT EXISTS error_detail text;
