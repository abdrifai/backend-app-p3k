/*
  Warnings:

  - You are about to drop the `task_usulan` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `task_usulan` DROP FOREIGN KEY `task_usulan_assignedToUserId_fkey`;

-- DropForeignKey
ALTER TABLE `task_usulan` DROP FOREIGN KEY `task_usulan_dataP3kId_fkey`;

-- DropTable
DROP TABLE `task_usulan`;

-- CreateTable
CREATE TABLE `task_usulan_pk` (
    `id` VARCHAR(36) NOT NULL,
    `dataP3kId` VARCHAR(36) NOT NULL,
    `assignedToUserId` VARCHAR(36) NOT NULL,
    `isCompleted` BOOLEAN NOT NULL DEFAULT false,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,

    INDEX `task_usulan_pk_assignedToUserId_idx`(`assignedToUserId`),
    INDEX `task_usulan_pk_dataP3kId_idx`(`dataP3kId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `task_usulan_pk` ADD CONSTRAINT `task_usulan_pk_dataP3kId_fkey` FOREIGN KEY (`dataP3kId`) REFERENCES `data_p3k`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task_usulan_pk` ADD CONSTRAINT `task_usulan_pk_assignedToUserId_fkey` FOREIGN KEY (`assignedToUserId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
