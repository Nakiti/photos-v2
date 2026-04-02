-- AlterTable
ALTER TABLE `Gallery` ADD COLUMN `requirePictureReview` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `uploadLimitPerHour` INTEGER NOT NULL DEFAULT 10;

-- AlterTable
ALTER TABLE `Photo` ADD COLUMN `deletedAt` DATETIME(3) NULL,
    ADD COLUMN `visible` ENUM('IN_REVIEW', 'VISIBLE') NOT NULL DEFAULT 'VISIBLE';

-- CreateTable
CREATE TABLE `PhotoLike` (
    `id` VARCHAR(191) NOT NULL,
    `photoId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PhotoLike_photoId_idx`(`photoId`),
    INDEX `PhotoLike_userId_idx`(`userId`),
    UNIQUE INDEX `PhotoLike_photoId_userId_key`(`photoId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Photo_galleryId_deletedAt_idx` ON `Photo`(`galleryId`, `deletedAt`);

-- CreateIndex
CREATE INDEX `Photo_visible_idx` ON `Photo`(`visible`);

-- AddForeignKey
ALTER TABLE `PhotoLike` ADD CONSTRAINT `PhotoLike_photoId_fkey` FOREIGN KEY (`photoId`) REFERENCES `Photo`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PhotoLike` ADD CONSTRAINT `PhotoLike_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
