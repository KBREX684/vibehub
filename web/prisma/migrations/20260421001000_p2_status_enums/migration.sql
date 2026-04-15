-- P2-BE-3: migrate String statuses to constrained enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EnterpriseMemberInviteStatus') THEN
    CREATE TYPE "EnterpriseMemberInviteStatus" AS ENUM ('pending', 'accepted', 'revoked');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReportTicketStatus') THEN
    CREATE TYPE "ReportTicketStatus" AS ENUM ('open', 'closed');
  END IF;
END $$;

ALTER TABLE "EnterpriseMemberInvite"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "EnterpriseMemberInviteStatus"
  USING CASE
    WHEN "status" = 'pending' THEN 'pending'::"EnterpriseMemberInviteStatus"
    WHEN "status" = 'accepted' THEN 'accepted'::"EnterpriseMemberInviteStatus"
    WHEN "status" = 'revoked' THEN 'revoked'::"EnterpriseMemberInviteStatus"
    ELSE 'pending'::"EnterpriseMemberInviteStatus"
  END,
  ALTER COLUMN "status" SET DEFAULT 'pending';

ALTER TABLE "ReportTicket"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "ReportTicketStatus"
  USING CASE
    WHEN "status" = 'open' THEN 'open'::"ReportTicketStatus"
    WHEN "status" IN ('resolved', 'closed') THEN 'closed'::"ReportTicketStatus"
    ELSE 'open'::"ReportTicketStatus"
  END,
  ALTER COLUMN "status" SET DEFAULT 'open';
