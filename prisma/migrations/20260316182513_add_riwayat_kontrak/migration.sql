-- CreateTable
CREATE TABLE `arsip_kontrak` (
    `id` VARCHAR(191) NOT NULL,
    `namaFile` VARCHAR(191) NULL,
    `fileUrl` VARCHAR(191) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `riwayat_kontrak` (
    `id` VARCHAR(191) NOT NULL,
    `kontrakKe` INTEGER NOT NULL,
    `tanggalMulai` VARCHAR(191) NOT NULL,
    `tanggalSelesai` VARCHAR(191) NOT NULL,
    `keterangan` VARCHAR(191) NULL,
    `dataP3kId` VARCHAR(191) NOT NULL,
    `arsipKontrakId` VARCHAR(191) NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `riwayat_kontrak_dataP3kId_idx`(`dataP3kId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `riwayat_kontrak` ADD CONSTRAINT `riwayat_kontrak_dataP3kId_fkey` FOREIGN KEY (`dataP3kId`) REFERENCES `data_p3k`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `riwayat_kontrak` ADD CONSTRAINT `riwayat_kontrak_arsipKontrakId_fkey` FOREIGN KEY (`arsipKontrakId`) REFERENCES `arsip_kontrak`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
