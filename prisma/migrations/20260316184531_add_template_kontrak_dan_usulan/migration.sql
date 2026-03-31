-- CreateTable
CREATE TABLE `template_kontrak` (
    `id` VARCHAR(191) NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `deskripsi` VARCHAR(191) NULL,
    `fileUrl` VARCHAR(191) NOT NULL,
    `namaFile` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `usulan_perpanjangan` (
    `id` VARCHAR(191) NOT NULL,
    `tanggalMulai` VARCHAR(191) NOT NULL,
    `tanggalSelesai` VARCHAR(191) NOT NULL,
    `keterangan` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `alasanPenolakan` VARCHAR(191) NULL,
    `generatedFileUrl` VARCHAR(191) NULL,
    `dataP3kId` VARCHAR(191) NOT NULL,
    `templateKontrakId` VARCHAR(191) NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `usulan_perpanjangan_dataP3kId_idx`(`dataP3kId`),
    INDEX `usulan_perpanjangan_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `usulan_perpanjangan` ADD CONSTRAINT `usulan_perpanjangan_dataP3kId_fkey` FOREIGN KEY (`dataP3kId`) REFERENCES `data_p3k`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usulan_perpanjangan` ADD CONSTRAINT `usulan_perpanjangan_templateKontrakId_fkey` FOREIGN KEY (`templateKontrakId`) REFERENCES `template_kontrak`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
