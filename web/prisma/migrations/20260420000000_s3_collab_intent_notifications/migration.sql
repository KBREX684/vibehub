-- S3: collaboration intent status (admin / project owner) — single kind + JSON metadata
ALTER TYPE "InAppNotificationKind" ADD VALUE IF NOT EXISTS 'collaboration_intent_status_update';
