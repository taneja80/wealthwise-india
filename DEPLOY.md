# Deploy Checklist — goalContributions jsonb Migration

Ordered steps for deploying the `cash_flow_projections.goalContributions`
text → jsonb change. **Order matters: migrate the database first, then
deploy the app.**

## 0. Before you start

- [ ] Have `DATABASE_URL` (or psql access) to the **live** database ready.
- [ ] Confirm the deployed column is still `text`:

  ```sql
  SELECT data_type FROM information_schema.columns
  WHERE table_name = 'cash_flow_projections' AND column_name = 'goalContributions';
  -- expected: text
  ```

- [ ] Take a backup of the table (the migration locks it, and the cast is
      one-way without an explicit reverse step):

  ```bash
  pg_dump "$DATABASE_URL" -t cash_flow_projections -f cash_flow_projections_backup.sql
  ```

## 1. Run the migration (against the live DB, first)

```bash
psql "$DATABASE_URL" -f scripts/migrate-goal-contributions.sql
```

What it does: takes an `ACCESS EXCLUSIVE` lock, validates every non-NULL
row (must be valid JSON, an object, all-numeric values), then casts the
column to `jsonb`. If any row fails validation, the transaction aborts
**before** the cast and names the offending row id.

**Verify:**

```sql
-- column is now jsonb
SELECT data_type FROM information_schema.columns
WHERE table_name = 'cash_flow_projections' AND column_name = 'goalContributions';
-- expected: jsonb

-- every stored value is a JSON object
SELECT COUNT(*) FROM cash_flow_projections
WHERE "goalContributions" IS NOT NULL AND jsonb_typeof("goalContributions") <> 'object';
-- expected: 0
```

**Rollback:**

- *Validation failed:* nothing to roll back — the transaction aborted
  before any change. Inspect the reported row id, fix or remove the bad
  value, re-run the script.
- *After success, if you must revert:* the cast is reversible, key order
  may change but data is preserved:

  ```sql
  ALTER TABLE cash_flow_projections
    ALTER COLUMN "goalContributions" TYPE text
    USING "goalContributions"::text;
  ```

## 2. Deploy the app

Deploy `main` through your normal pipeline (Render, per `render.yaml`, or
Docker). The new code declares the column as `jsonb` and keys
`goalContributions` by goal id.

**Do not deploy before step 1.** The old column may contain rows the new
code cannot parse (legacy non-JSON or non-numeric values); the migration
is what finds and blocks those. Deploying first risks silent data
divergence instead of a clean, pre-checked failure.

## 3. After deploying — verify

- [ ] App boots and the Cash Flow page loads; regenerating projections
      succeeds.
- [ ] New projection rows use goal-id keys:

  ```sql
  SELECT "goalContributions" FROM cash_flow_projections LIMIT 3;
  -- keys are stringified goal ids, e.g. {"1": 120000, "2": 60000}
  ```

- [ ] Existing rows self-heal: the Cash Flow page calls
      `cashFlow.generate` on load, which rebuilds each user's projections
      with id keys on first visit after deploy. No data migration needed
      for the key change.

## Do NOT

- **Do not run `npm run db:migrate` against the live database.** The
  migration history under `db/migrations/` is a fresh PostgreSQL
  bookkeeping baseline (see commit `1d33db0`); the live database was
  built with `db:push`. Keep managing it with `db:push` plus the manual
  script above.
- **Do not skip the backup.** The lock blocks reads and writes on
  `cash_flow_projections` for the duration of the migration.

## Reference

- Migration script: `scripts/migrate-goal-contributions.sql`
- Schema: `db/schema.ts` (`cashFlowProjections.goalContributions`)
- Fix for duplicate goal names: commit `997d1a4`
