-- ============================================================
-- Migration 0008: Rivuchit Accounting Export Support
-- Adds product catalog, customer account number, catalog link on packed items
-- ============================================================

-- 1. PRODUCT CATALOG TABLE
-- Maps factory products to Rivuchit accounting software entries
CREATE TABLE `product_catalog` (
  `id` int AUTO_INCREMENT NOT NULL,
  `rivuchitProductId` int NOT NULL,
  `nameHebrew` varchar(255) NOT NULL,
  `nameEnglish` varchar(255),
  `productType` enum('white_basket','brown_basket','mix','white_filling','brown_filling','white_small','brown_small') NOT NULL,
  `unitDescription` varchar(100) NOT NULL COMMENT '8 units / 3 kg / 5 kg etc.',
  `pricePerUnit` decimal(10,2) NOT NULL DEFAULT 0.00,
  `isSpecialCustomer` tinyint(1) NOT NULL DEFAULT 0,
  `status` enum('active','inactive') NOT NULL DEFAULT 'active',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `product_catalog_id` PRIMARY KEY(`id`)
);

-- Pre-populate with the 9 known Rivuchit products
INSERT INTO `product_catalog`
  (`rivuchitProductId`, `nameHebrew`, `nameEnglish`, `productType`, `unitDescription`, `pricePerUnit`, `isSpecialCustomer`)
VALUES
  (1, 'שמפיניון א.א. א - 8 יח\'',  'White Basket 8 units',        'white_basket',   '8 units',  42.00, 0),
  (2, 'מיני פורטובלו - 8 יח\'',    'Brown Basket 8 units',        'brown_basket',   '8 units',  43.00, 0),
  (3, 'דואט איטלקי - 4 יח\'',      'Mix 4 pairs',                 'mix',            '4 pairs',  43.00, 0),
  (4, 'שמפיניון מילוי - 3 ק"ג',    'White Filling 3 kg',          'white_filling',  '3 kg',     72.00, 0),
  (5, 'פורטובלו מילוי/חורש - 3 ק"ג','Brown Filling 3 kg',         'brown_filling',  '3 kg',     75.00, 0),
  (6, 'שמפיניון ב - 5 ק"ג',        'White Grade B 5 kg',          'white_small',    '5 kg',     85.00, 0),
  (7, 'פורטובלו ב - 5 ק"ג',        'Brown Grade B 5 kg',          'brown_small',    '5 kg',     76.00, 0),
  (8, 'לבן מילוי 2 ק"ג',           'White Filling 2 kg (Special)','white_filling',  '2 kg',     48.00, 1),
  (9, 'שמפיניון א.ת. - 6 יח\'',    'White Basket 6 units (Special)','white_basket', '6 units',  98.00, 1);

-- 2. ADD RIVUCHIT ACCOUNT NUMBER TO CUSTOMERS
ALTER TABLE `customers`
  ADD COLUMN `rivuchitAccountNumber` varchar(50) AFTER `name`;

-- 3. ADD PRODUCT CATALOG LINK TO PACKED INVENTORY
ALTER TABLE `packed_inventory`
  ADD COLUMN `productCatalogId` int AFTER `productType`;
