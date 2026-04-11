/*
  Warnings:

  - You are about to drop the column `status` on the `Membership` table. All the data in the column will be lost.
  - You are about to drop the `Friendship` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `Friendship` DROP FOREIGN KEY `Friendship_receiverId_fkey`;

-- DropForeignKey
ALTER TABLE `Friendship` DROP FOREIGN KEY `Friendship_requesterId_fkey`;

-- AlterTable
ALTER TABLE `Gallery` MODIFY `uploadLimitPerHour` INTEGER NOT NULL DEFAULT 200;

-- AlterTable
ALTER TABLE `Membership` DROP COLUMN `status`;

-- DropTable
DROP TABLE `Friendship`;
