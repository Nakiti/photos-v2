-- AlterTable
ALTER TABLE `Gallery` ADD COLUMN `communityId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `Community` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `iconUrl` VARCHAR(191) NULL,
    `ownerId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `joinRequiresApproval` BOOLEAN NOT NULL DEFAULT false,
    `addPermission` ENUM('ANYONE', 'ADMIN') NOT NULL DEFAULT 'ADMIN',
    `deletePermission` ENUM('ADMINS_AUTHORS', 'ADMIN') NOT NULL DEFAULT 'ADMINS_AUTHORS',

    INDEX `Community_ownerId_idx`(`ownerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CommunityMembership` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `communityId` VARCHAR(191) NOT NULL,
    `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `role` ENUM('ADMIN', 'MEMBER') NOT NULL DEFAULT 'MEMBER',

    INDEX `CommunityMembership_userId_idx`(`userId`),
    INDEX `CommunityMembership_communityId_idx`(`communityId`),
    UNIQUE INDEX `CommunityMembership_userId_communityId_key`(`userId`, `communityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Gallery_communityId_idx` ON `Gallery`(`communityId`);

-- AddForeignKey
ALTER TABLE `Gallery` ADD CONSTRAINT `Gallery_communityId_fkey` FOREIGN KEY (`communityId`) REFERENCES `Community`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Community` ADD CONSTRAINT `Community_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommunityMembership` ADD CONSTRAINT `CommunityMembership_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CommunityMembership` ADD CONSTRAINT `CommunityMembership_communityId_fkey` FOREIGN KEY (`communityId`) REFERENCES `Community`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
