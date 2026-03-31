-- CreateTable
CREATE TABLE `task_field_configs` (
    `id` VARCHAR(36) NOT NULL,
    `fieldName` VARCHAR(100) NOT NULL,
    `label` VARCHAR(150) NOT NULL,
    `inputType` VARCHAR(20) NOT NULL DEFAULT 'text',
    `groupName` VARCHAR(50) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT false,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `task_field_configs_fieldName_key`(`fieldName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
