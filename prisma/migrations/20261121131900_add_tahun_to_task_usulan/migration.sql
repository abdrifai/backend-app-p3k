-- AlterTable
ALTER TABLE `task_usulan_pk` ADD COLUMN `tahun` INTEGER NOT NULL DEFAULT 2026;

-- Backfill data lama berdasarkan tahun pembuatan tugas (createdAt)
UPDATE `task_usulan_pk` SET `tahun` = YEAR(`createdAt`) WHERE `createdAt` IS NOT NULL;

-- CreateIndex
CREATE INDEX `task_usulan_pk_tahun_idx` ON `task_usulan_pk`(`tahun`);
