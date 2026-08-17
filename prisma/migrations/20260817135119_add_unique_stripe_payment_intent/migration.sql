/*
  Warnings:

  - A unique constraint covering the columns `[stripePaymentIntentId]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.
  - Made the column `stripePaymentIntentId` on table `Payment` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Payment" ALTER COLUMN "stripePaymentIntentId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Payment_stripePaymentIntentId_key" ON "Payment"("stripePaymentIntentId");
