-- ============================================================
-- Migration 0007: Factory Redesign
-- Adds grow cycles, customers, deliveries tables
-- Extends harvest_records, harvested_inventory, packed_inventory
-- Updates inventory_movements enum
-- ============================================================

-- 1. GROW CYCLES TABLE
CREATE TABLE `grow_cycles` (
  `id` int AUTO_INCREMENT NOT NULL,
  `roomId` int NOT NULL,
  `cycleNumber` int NOT NULL,
  `startDate` date NOT NULL,
  `endDate` date,
  `status` enum('active','harvesting','completed') NOT NULL DEFAULT 'active',
  `notes` text,
  `createdByUserId` int,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `grow_cycles_id` PRIMARY KEY(`id`)
);

-- 2. CUSTOMERS TABLE
CREATE TABLE `customers` (
  `id` int AUTO_INCREMENT NOT NULL,
  `name` varchar(255) NOT NULL,
  `phone` varchar(50),
  `address` text,
  `notes` text,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `customers_id` PRIMARY KEY(`id`)
);

-- 3. DELIVERIES TABLE
CREATE TABLE `deliveries` (
  `id` int AUTO_INCREMENT NOT NULL,
  `customerId` int,
  `deliveryDate` date NOT NULL,
  `notes` text,
  `status` enum('draft','dispatched') NOT NULL DEFAULT 'draft',
  `totalWeight` decimal(10,2),
  `totalCartons` int,
  `createdByUserId` int,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `deliveries_id` PRIMARY KEY(`id`)
);

-- 4. DELIVERY ITEMS TABLE
CREATE TABLE `delivery_items` (
  `id` int AUTO_INCREMENT NOT NULL,
  `deliveryId` int NOT NULL,
  `packedInventoryId` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `delivery_items_id` PRIMARY KEY(`id`)
);

-- 5. HARVEST RECORDS: add growCycleId
ALTER TABLE `harvest_records`
  ADD COLUMN `growCycleId` int AFTER `harvestWave`;

-- 6. HARVESTED INVENTORY: add harvestRecordId, basketCount, remainingBaskets
ALTER TABLE `harvested_inventory`
  ADD COLUMN `harvestRecordId` int AFTER `sizeId`,
  ADD COLUMN `basketCount` int AFTER `boxCount`,
  ADD COLUMN `remainingBaskets` int AFTER `basketCount`;

-- 7. PACKED INVENTORY: add productType, basketCount, packerId
ALTER TABLE `packed_inventory`
  ADD COLUMN `productType` enum('white_basket','brown_basket','mix','filling') AFTER `packagingTypeId`,
  ADD COLUMN `basketCount` int AFTER `unitCount`,
  ADD COLUMN `packerId` int AFTER `basketCount`;

-- 8. PACKED SOURCE LINKS: add basketsUsed
ALTER TABLE `packed_source_links`
  ADD COLUMN `basketsUsed` int AFTER `weightUsed`;

-- 9. INVENTORY MOVEMENTS: update movementType enum + add resultingInventoryId
ALTER TABLE `inventory_movements`
  MODIFY COLUMN `movementType` enum(
    'harvest_intake',
    'move_to_packing',
    'consume_for_packing',
    'packed_intake',
    'outbound',
    'downgrade',
    'correction',
    'cancellation',
    'waste'
  ) NOT NULL,
  ADD COLUMN `resultingInventoryId` int AFTER `quantity`;
