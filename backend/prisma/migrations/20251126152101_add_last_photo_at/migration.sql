-- AlterTable
ALTER TABLE `Gallery` ADD COLUMN `lastPhotoAt` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `Gallery_lastPhotoAt_idx` ON `Gallery`(`lastPhotoAt`);
