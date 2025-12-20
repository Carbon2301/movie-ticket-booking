-- AlterTable
ALTER TABLE `payment` ADD COLUMN `reason` TEXT NULL,
    ADD COLUMN `requestedAt` DATETIME(3) NULL;
