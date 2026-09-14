WITH ranked_defaults AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "userId" ORDER BY "createdAt", id) AS row_number
  FROM "Vehicle"
  WHERE "isDefault" = true
)
UPDATE "Vehicle"
SET "isDefault" = false
WHERE id IN (SELECT id FROM ranked_defaults WHERE row_number > 1);

CREATE UNIQUE INDEX "Vehicle_one_default_per_user"
ON "Vehicle"("userId")
WHERE "isDefault" = true;
