-- AlterTable
ALTER TABLE `data_p3k` ADD COLUMN `assignedToId` VARCHAR(191) NULL,
    ADD COLUMN `editedById` VARCHAR(191) NULL,
    ADD COLUMN `isTaskCompleted` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `taskCompletedAt` DATETIME(3) NULL;

-- AddForeignKey
ALTER TABLE `data_p3k` ADD CONSTRAINT `data_p3k_assignedToId_fkey` FOREIGN KEY (`assignedToId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `data_p3k` ADD CONSTRAINT `data_p3k_editedById_fkey` FOREIGN KEY (`editedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
