-- AlterTable
ALTER TABLE `usulan_perpanjangan` ADD COLUMN `nomorKontrak` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `tabel_gaji` (
    `id` VARCHAR(191) NOT NULL,
    `golongan` VARCHAR(191) NOT NULL,
    `mkTahun` INTEGER NOT NULL,
    `gaji` INTEGER NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tabel_gaji_golongan_mkTahun_key`(`golongan`, `mkTahun`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
