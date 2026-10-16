-- Migration: cash_flow_projections.goalContributions text -> jsonb
--
-- Context: the deployed column is still text; db/schema.ts now declares it
-- as jsonb. Run this ONCE against the live database BEFORE deploying the
-- app change, then deploy.
--
-- Behavior:
--   * Locks the table in ACCESS EXCLUSIVE mode for the duration.
--   * Validates every non-NULL row first: must be valid JSON, a JSON object,
--     and all object values must be numbers.
--   * If any row fails validation, the whole transaction aborts before the
--     cast -- inspect the reported row id, fix the data, and re-run.
--   * SQL NULL rows remain NULL through the cast.
--
-- Duplicate goal names are NOT caught here (JSON object keys are unique);
-- that is an app-level concern (cashflow projection keys contributions by
-- goal name, so same-named goals overwrite each other in the breakdown).

BEGIN;
LOCK TABLE cash_flow_projections IN ACCESS EXCLUSIVE MODE;

DO $$
DECLARE
  r record;
  parsed jsonb;
BEGIN
  FOR r IN
    SELECT id, "goalContributions" AS raw_value
    FROM cash_flow_projections
    WHERE "goalContributions" IS NOT NULL
  LOOP
    BEGIN
      parsed := r.raw_value::jsonb;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'goalContributions for row % is invalid JSON', r.id;
    END;

    IF jsonb_typeof(parsed) IS DISTINCT FROM 'object' THEN
      RAISE EXCEPTION 'goalContributions for row % must be a JSON object', r.id;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM jsonb_each(parsed) AS kv(key, value)
      WHERE jsonb_typeof(kv.value) <> 'number'
    ) THEN
      RAISE EXCEPTION 'goalContributions for row % contains a non-numeric value', r.id;
    END IF;
  END LOOP;
END $$;

ALTER TABLE cash_flow_projections
  ALTER COLUMN "goalContributions" TYPE jsonb
  USING "goalContributions"::jsonb;

COMMIT;
