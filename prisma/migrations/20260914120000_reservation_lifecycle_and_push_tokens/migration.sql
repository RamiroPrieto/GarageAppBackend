ALTER TYPE "ReservationStatus" ADD VALUE IF NOT EXISTS 'ACTIVE';

ALTER TABLE "Reservation"
  ADD COLUMN "customerStartedAt" TIMESTAMP(3),
  ADD COLUMN "ownerStartedAt" TIMESTAMP(3),
  ADD COLUMN "startedAt" TIMESTAMP(3);

CREATE TABLE "PushToken" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER NOT NULL,
  "token" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PushToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PushToken_token_key" ON "PushToken"("token");
CREATE INDEX "PushToken_userId_idx" ON "PushToken"("userId");
ALTER TABLE "PushToken" ADD CONSTRAINT "PushToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
