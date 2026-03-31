-- AlterTable
ALTER TABLE `usulan_perpanjangan` ADD COLUMN `assignedToId` VARCHAR(191) NULL,
    ADD COLUMN `editedById` VARCHAR(191) NULL,
    ADD COLUMN `isTaskCompleted` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `tanggalTtd` VARCHAR(191) NULL,
    ADD COLUMN `taskCompletedAt` DATETIME(3) NULL;

-- AddForeignKey
ALTER TABLE `usulan_perpanjangan` ADD CONSTRAINT `usulan_perpanjangan_assignedToId_fkey` FOREIGN KEY (`assignedToId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usulan_perpanjangan` ADD CONSTRAINT `usulan_perpanjangan_editedById_fkey` FOREIGN KEY (`editedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
