/*
  Warnings:

  - A unique constraint covering the columns `[defaultTagId]` on the table `Gallery` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[handle]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `thumbnailUrl` to the `Photo` table without a default value. This is not possible if the table is not empty.
  - Added the required column `handle` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Gallery` ADD COLUMN `addPermission` ENUM('ANYONE', 'ADMIN') NOT NULL DEFAULT 'ADMIN',
    ADD COLUMN `defaultTagId` VARCHAR(191) NULL,
    ADD COLUMN `deletePermission` ENUM('ADMINS_AUTHORS', 'ADMIN') NOT NULL DEFAULT 'ADMINS_AUTHORS',
    ADD COLUMN `joinRequiresApproval` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `Membership` ADD COLUMN `isMuted` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `role` ENUM('ADMIN', 'MEMBER') NOT NULL DEFAULT 'MEMBER',
    ADD COLUMN `status` ENUM('PENDING', 'ACCEPTED', 'INVITED', 'BLOCKED') NOT NULL DEFAULT 'ACCEPTED';

-- AlterTable
ALTER TABLE `Photo` ADD COLUMN `thumbnailUrl` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `handle` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Gallery_defaultTagId_key` ON `Gallery`(`defaultTagId`);

-- CreateIndex
CREATE UNIQUE INDEX `User_handle_key` ON `User`(`handle`);
