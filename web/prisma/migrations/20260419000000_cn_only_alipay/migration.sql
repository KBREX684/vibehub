ALTER TABLE "UserSubscription" ALTER COLUMN "paymentProvider" DROP DEFAULT;
ALTER TABLE "BillingRecord" ALTER COLUMN "paymentProvider" TYPE TEXT USING "paymentProvider"::text;
ALTER TABLE "UserSubscription" ALTER COLUMN "paymentProvider" TYPE TEXT USING "paymentProvider"::text;

UPDATE "UserSubscription" SET "paymentProvider" = 'alipay';
UPDATE "BillingRecord" SET "paymentProvider" = 'alipay';
UPDATE "BillingRecord" SET "currency" = 'CNY' WHERE "currency" IS NULL OR "currency" = 'USD';

DROP TYPE "PaymentProvider";
CREATE TYPE "PaymentProvider" AS ENUM ('alipay');

ALTER TABLE "UserSubscription"
  ALTER COLUMN "paymentProvider" TYPE "PaymentProvider" USING 'alipay'::"PaymentProvider",
  ALTER COLUMN "paymentProvider" SET DEFAULT 'alipay';

ALTER TABLE "BillingRecord"
  ALTER COLUMN "paymentProvider" TYPE "PaymentProvider" USING 'alipay'::"PaymentProvider",
  ALTER COLUMN "currency" SET DEFAULT 'CNY';

DROP INDEX IF EXISTS "User_stripeCustomerId_key";
DROP INDEX IF EXISTS "UserSubscription_stripeSubscriptionId_key";
DROP INDEX IF EXISTS "UserSubscription_stripeSubscriptionId_idx";

ALTER TABLE "User" DROP COLUMN IF EXISTS "stripeCustomerId";
ALTER TABLE "UserSubscription" DROP COLUMN IF EXISTS "stripeSubscriptionId";
ALTER TABLE "UserSubscription" DROP COLUMN IF EXISTS "stripePriceId";
