-- CreateTable
CREATE TABLE `Menu` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `route` VARCHAR(191) NULL,
    `icon` VARCHAR(191) NULL,
    `parentId` INTEGER NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Menu_parentId_idx`(`parentId`),
    INDEX `Menu_sortOrder_idx`(`sortOrder`),
    INDEX `Menu_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RoleMenu` (
    `roleId` INTEGER NOT NULL,
    `menuId` INTEGER NOT NULL,

    INDEX `RoleMenu_menuId_idx`(`menuId`),
    PRIMARY KEY (`roleId`, `menuId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Menu` ADD CONSTRAINT `Menu_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `Menu`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RoleMenu` ADD CONSTRAINT `RoleMenu_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RoleMenu` ADD CONSTRAINT `RoleMenu_menuId_fkey` FOREIGN KEY (`menuId`) REFERENCES `Menu`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
