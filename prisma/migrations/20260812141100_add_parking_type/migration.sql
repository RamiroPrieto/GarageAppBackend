/*
  Warnings:

  - Changed the type of `parkingType` on the `Parking` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "ParkingType" AS ENUM ('HOUSE', 'BUILDING', 'COMMERCIAL', 'GARAGE');

-- AlterTable
ALTER TABLE "Parking" DROP COLUMN "parkingType",
ADD COLUMN     "parkingType" "ParkingType" NOT NULL;
