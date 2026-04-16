-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('stripe', 'alipay', 'wechatpay');

-- AlterTable
ALTER TABLE "UserSubscription" ADD COLUMN     "paymentProvider" "PaymentProvider" NOT NULL DEFAULT 'stripe';
