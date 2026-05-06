CREATE TABLE `barcode_sequences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`prefix` varchar(20) NOT NULL,
	`dateCode` varchar(10) NOT NULL,
	`lastSequence` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `barcode_sequences_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `harvested_inventory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`barcode` varchar(50) NOT NULL,
	`batchNumber` varchar(50) NOT NULL,
	`harvestDate` date NOT NULL,
	`harvestTime` varchar(10),
	`roomId` int NOT NULL,
	`harvestWave` int NOT NULL,
	`employeeId` int NOT NULL,
	`categoryId` int NOT NULL,
	`sizeId` int,
	`originalWeight` decimal(10,2) NOT NULL,
	`consumedWeight` decimal(10,2) NOT NULL DEFAULT '0',
	`remainingWeight` decimal(10,2) NOT NULL,
	`boxCount` int NOT NULL,
	`storageLocation` varchar(100),
	`status` enum('available','partially_consumed','fully_consumed','in_packing','deducted','cancelled','damaged') NOT NULL DEFAULT 'available',
	`notes` text,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `harvested_inventory_id` PRIMARY KEY(`id`),
	CONSTRAINT `harvested_inventory_barcode_unique` UNIQUE(`barcode`)
);
--> statement-breakpoint
CREATE TABLE `inventory_movements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`movementDate` date NOT NULL,
	`movementTime` varchar(10),
	`movementType` enum('harvest_intake','consume_for_packing','packed_intake','outbound','correction','cancellation','waste') NOT NULL,
	`inventoryType` enum('harvested','packed') NOT NULL,
	`itemId` int NOT NULL,
	`itemBarcode` varchar(50),
	`weight` decimal(10,2),
	`quantity` int,
	`userId` int,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inventory_movements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `packed_inventory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`barcode` varchar(50) NOT NULL,
	`batchNumber` varchar(50) NOT NULL,
	`packingDate` date NOT NULL,
	`packingTime` varchar(10),
	`harvestWave` int NOT NULL,
	`categoryId` int NOT NULL,
	`sizeId` int,
	`packagingTypeId` int NOT NULL,
	`packedWeight` decimal(10,2) NOT NULL,
	`unitCount` int NOT NULL,
	`storageLocation` varchar(100),
	`expiryDate` date,
	`status` enum('available','shipped','damaged','cancelled') NOT NULL DEFAULT 'available',
	`notes` text,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `packed_inventory_id` PRIMARY KEY(`id`),
	CONSTRAINT `packed_inventory_barcode_unique` UNIQUE(`barcode`)
);
--> statement-breakpoint
CREATE TABLE `packed_source_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`packedInventoryId` int NOT NULL,
	`harvestedInventoryId` int NOT NULL,
	`weightUsed` decimal(10,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `packed_source_links_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `harvest_records` ADD `harvestWave` int;