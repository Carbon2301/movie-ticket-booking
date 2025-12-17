/*
  Warnings:

  - You are about to drop the column `price` on the `schedule` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name,location]` on the table `Cinema` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[title]` on the table `Movie` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[cinemaId,name]` on the table `Room` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[movieId,roomId,startTime]` on the table `Schedule` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[scheduleId,seatCode]` on the table `Ticket` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `schedule` DROP COLUMN `price`;

-- CreateIndex
CREATE UNIQUE INDEX `Cinema_name_location_key` ON `Cinema`(`name`, `location`);

-- CreateIndex
CREATE UNIQUE INDEX `Movie_title_key` ON `Movie`(`title`);

-- CreateIndex
CREATE UNIQUE INDEX `Room_cinemaId_name_key` ON `Room`(`cinemaId`, `name`);

-- CreateIndex
CREATE UNIQUE INDEX `Schedule_movieId_roomId_startTime_key` ON `Schedule`(`movieId`, `roomId`, `startTime`);

-- CreateIndex
CREATE UNIQUE INDEX `Ticket_scheduleId_seatCode_key` ON `Ticket`(`scheduleId`, `seatCode`);
