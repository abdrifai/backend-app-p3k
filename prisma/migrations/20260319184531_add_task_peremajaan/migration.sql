/*
  Warnings:

  - You are about to drop the column `assignedToId` on the `data_p3k` table. All the data in the column will be lost.
  - You are about to drop the column `isTaskCompleted` on the `data_p3k` table. All the data in the column will be lost.
  - You are about to drop the column `taskCompletedAt` on the `data_p3k` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `data_p3k` DROP FOREIGN KEY `data_p3k_assignedToId_fkey`;

-- AlterTable
ALTER TABLE `data_p3k` DROP COLUMN `assignedToId`,
    DROP COLUMN `isTaskCompleted`,
    DROP COLUMN `taskCompletedAt`;

-- CreateTable
CREATE TABLE `task_peremajaan` (
    `id` VARCHAR(36) NOT NULL,
    `dataP3kId` VARCHAR(36) NOT NULL,
    `assignedToUserId` VARCHAR(36) NOT NULL,
    `isCompleted` BOOLEAN NOT NULL DEFAULT false,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,

    INDEX `task_peremajaan_assignedToUserId_idx`(`assignedToUserId`),
    INDEX `task_peremajaan_dataP3kId_idx`(`dataP3kId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `task_peremajaan` ADD CONSTRAINT `task_peremajaan_dataP3kId_fkey` FOREIGN KEY (`dataP3kId`) REFERENCES `data_p3k`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_peremajaan` ADD CONSTRAINT `task_peremajaan_assignedToUserId_fkey` FOREIGN KEY (`assignedToUserId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
