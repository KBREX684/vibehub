-- Clean-schema preflight for status enum migration.
-- When the same database already has matching enum names in another schema
-- (commonly public), a typname-only check can skip creation for the active
-- schema. Ensure the current schema has the required enums before the later
-- migration runs its ALTER TABLE statements.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'EnterpriseMemberInviteStatus'
      AND n.nspname = current_schema()
  ) THEN
    EXECUTE format(
      'CREATE TYPE %I.%I AS ENUM (''pending'', ''accepted'', ''revoked'')',
      current_schema(),
      'EnterpriseMemberInviteStatus'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'ReportTicketStatus'
      AND n.nspname = current_schema()
  ) THEN
    EXECUTE format(
      'CREATE TYPE %I.%I AS ENUM (''open'', ''closed'')',
      current_schema(),
      'ReportTicketStatus'
    );
  END IF;
END $$;
