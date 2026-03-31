/*
  Warnings:

  - You are about to drop the column `unorInduk` on the `data_p3k` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `data_p3k` DROP COLUMN `unorInduk`,
    ADD COLUMN `unorIndukId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `data_p3k` ADD CONSTRAINT `data_p3k_unorIndukId_fkey` FOREIGN KEY (`unorIndukId`) REFERENCES `ref_unor`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
