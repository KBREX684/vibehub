-- Clean-schema preflight for P2 full-text migration.
-- Some databases already have public.CreatorProfile.searchVector from earlier
-- local runs, but a fresh non-public schema will not. The later migration
-- checks information_schema against public and may skip adding the column for
-- the active schema, so we ensure the current schema is ready here.

CREATE OR REPLACE FUNCTION immutable_array_to_string(arr text[], sep text)
  RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE AS
  $fn$ SELECT array_to_string(arr, sep) $fn$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'CreatorProfile'
      AND column_name = 'searchVector'
  ) THEN
    ALTER TABLE "CreatorProfile" ADD COLUMN "searchVector" tsvector
      GENERATED ALWAYS AS (
        to_tsvector(
          'english'::regconfig,
          coalesce(slug, '') || ' ' || coalesce(headline, '') || ' ' || coalesce(bio, '') || ' ' || immutable_array_to_string(skills, ' ')
        )
      ) STORED;
  END IF;
END $$;
