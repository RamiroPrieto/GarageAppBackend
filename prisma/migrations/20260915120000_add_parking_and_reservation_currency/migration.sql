-- Preserve existing monetary values as euros while adding explicit currency snapshots.
CREATE TYPE "Currency" AS ENUM ('EUR', 'USD');

ALTER TABLE "Parking"
ADD COLUMN "currency" "Currency" NOT NULL DEFAULT 'EUR';

ALTER TABLE "Reservation"
ADD COLUMN "currency" "Currency" NOT NULL DEFAULT 'EUR';

ALTER TABLE "Reservation"
ALTER COLUMN "currency" DROP DEFAULT;
