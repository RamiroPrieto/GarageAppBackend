ALTER TABLE "User"
  ADD COLUMN "pendingPhone" TEXT,
  ADD COLUMN "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "phoneVerificationSentAt" TIMESTAMP(3);

UPDATE "User" SET "phoneVerified" = true WHERE "phone" IS NOT NULL;
