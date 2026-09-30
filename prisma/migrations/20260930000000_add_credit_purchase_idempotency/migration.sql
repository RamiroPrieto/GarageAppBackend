ALTER TABLE "CreditPurchase" ADD COLUMN "idempotencyKey" TEXT;

UPDATE "CreditPurchase"
SET "idempotencyKey" = 'legacy-' || "id"::TEXT
WHERE "idempotencyKey" IS NULL;

ALTER TABLE "CreditPurchase" ALTER COLUMN "idempotencyKey" SET NOT NULL;
CREATE UNIQUE INDEX "CreditPurchase_idempotencyKey_key" ON "CreditPurchase"("idempotencyKey");
