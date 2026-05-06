import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, date } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const employees = mysqlTable("employees", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  employeeNumber: varchar("employeeNumber", { length: 50 }),
  phone: varchar("phone", { length: 50 }),
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  role: mysqlEnum("role", ["worker", "supervisor", "manager"]).default("worker").notNull(),
  startDate: date("startDate"),
  userId: int("userId"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = typeof employees.$inferInsert;

export const rooms = mysqlTable("rooms", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  roomType: varchar("roomType", { length: 100 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Room = typeof rooms.$inferSelect;
export type InsertRoom = typeof rooms.$inferInsert;

export const packagingTypes = mysqlTable("packaging_types", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PackagingType = typeof packagingTypes.$inferSelect;
export type InsertPackagingType = typeof packagingTypes.$inferInsert;

export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

export const shifts = mysqlTable("shifts", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  startTime: varchar("startTime", { length: 10 }),
  endTime: varchar("endTime", { length: 10 }),
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Shift = typeof shifts.$inferSelect;
export type InsertShift = typeof shifts.$inferInsert;

export const sizes = mysqlTable("sizes", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Size = typeof sizes.$inferSelect;
export type InsertSize = typeof sizes.$inferInsert;

// ============ PRODUCT CATALOG (Rivuchit accounting link) ============

export const productCatalog = mysqlTable("product_catalog", {
  id: int("id").autoincrement().primaryKey(),
  rivuchitProductId: int("rivuchitProductId").notNull(),
  nameHebrew: varchar("nameHebrew", { length: 255 }).notNull(),
  nameEnglish: varchar("nameEnglish", { length: 255 }),
  productType: mysqlEnum("productType", [
    "white_basket", "brown_basket", "mix",
    "white_filling", "brown_filling",
    "white_small", "brown_small",
  ]).notNull(),
  unitDescription: varchar("unitDescription", { length: 100 }).notNull(),
  pricePerUnit: decimal("pricePerUnit", { precision: 10, scale: 2 }).notNull().default("0"),
  isSpecialCustomer: int("isSpecialCustomer").notNull().default(0),
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProductCatalog = typeof productCatalog.$inferSelect;
export type InsertProductCatalog = typeof productCatalog.$inferInsert;

// ============ GROW CYCLES ============

export const growCycles = mysqlTable("grow_cycles", {
  id: int("id").autoincrement().primaryKey(),
  roomId: int("roomId").notNull(),
  cycleNumber: int("cycleNumber").notNull(),
  startDate: date("startDate").notNull(),
  endDate: date("endDate"),
  status: mysqlEnum("status", ["active", "harvesting", "completed"]).default("active").notNull(),
  notes: text("notes"),
  createdByUserId: int("createdByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GrowCycle = typeof growCycles.$inferSelect;
export type InsertGrowCycle = typeof growCycles.$inferInsert;

// ============ CUSTOMERS ============

export const customers = mysqlTable("customers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  rivuchitAccountNumber: varchar("rivuchitAccountNumber", { length: 50 }),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  notes: text("notes"),
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;

// ============ DELIVERIES ============

export const deliveries = mysqlTable("deliveries", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId"),
  deliveryDate: date("deliveryDate").notNull(),
  notes: text("notes"),
  status: mysqlEnum("status", ["draft", "dispatched"]).default("draft").notNull(),
  totalWeight: decimal("totalWeight", { precision: 10, scale: 2 }),
  totalCartons: int("totalCartons"),
  createdByUserId: int("createdByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Delivery = typeof deliveries.$inferSelect;
export type InsertDelivery = typeof deliveries.$inferInsert;

export const deliveryItems = mysqlTable("delivery_items", {
  id: int("id").autoincrement().primaryKey(),
  deliveryId: int("deliveryId").notNull(),
  packedInventoryId: int("packedInventoryId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DeliveryItem = typeof deliveryItems.$inferSelect;
export type InsertDeliveryItem = typeof deliveryItems.$inferInsert;

// ============ HARVEST RECORDS ============

export const harvestRecords = mysqlTable("harvest_records", {
  id: int("id").autoincrement().primaryKey(),
  workDate: date("workDate").notNull(),
  workTime: varchar("workTime", { length: 10 }),
  employeeId: int("employeeId").notNull(),
  roomId: int("roomId").notNull(),
  shiftId: int("shiftId").notNull(),
  packagingTypeId: int("packagingTypeId").notNull(),
  categoryId: int("categoryId").notNull(),
  sizeId: int("sizeId"),
  harvestWave: int("harvestWave"),
  growCycleId: int("growCycleId"),
  boxCount: int("boxCount").notNull(),
  totalWeight: decimal("totalWeight", { precision: 10, scale: 2 }).notNull(),
  avgWeightPerBox: decimal("avgWeightPerBox", { precision: 10, scale: 3 }),
  notes: text("notes"),
  status: mysqlEnum("status", ["draft", "approved", "cancelled"]).default("draft").notNull(),
  createdByUserId: int("createdByUserId"),
  approvedByUserId: int("approvedByUserId"),
  approvedAt: timestamp("approvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type HarvestRecord = typeof harvestRecords.$inferSelect;
export type InsertHarvestRecord = typeof harvestRecords.$inferInsert;

export const auditLog = mysqlTable("audit_log", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  action: varchar("action", { length: 100 }).notNull(),
  tableName: varchar("tableName", { length: 100 }),
  recordId: int("recordId"),
  oldValues: text("oldValues"),
  newValues: text("newValues"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLog.$inferSelect;
export type InsertAuditLog = typeof auditLog.$inferInsert;

// ============ INVENTORY MODULE ============

export const harvestedInventory = mysqlTable("harvested_inventory", {
  id: int("id").autoincrement().primaryKey(),
  barcode: varchar("barcode", { length: 50 }).notNull().unique(),
  batchNumber: varchar("batchNumber", { length: 50 }).notNull(),
  harvestDate: date("harvestDate").notNull(),
  harvestTime: varchar("harvestTime", { length: 10 }),
  roomId: int("roomId").notNull(),
  harvestWave: int("harvestWave").notNull(),
  employeeId: int("employeeId").notNull(),
  categoryId: int("categoryId").notNull(),
  sizeId: int("sizeId"),
  // Link back to the harvest record that created this inventory item
  harvestRecordId: int("harvestRecordId"),
  originalWeight: decimal("originalWeight", { precision: 10, scale: 2 }).notNull(),
  consumedWeight: decimal("consumedWeight", { precision: 10, scale: 2 }).default("0").notNull(),
  remainingWeight: decimal("remainingWeight", { precision: 10, scale: 2 }).notNull(),
  // boxCount = number of raw harvest cartons (each holds 6 baskets)
  boxCount: int("boxCount").notNull(),
  // basketCount = total individual baskets (boxCount × 6 for basket products)
  basketCount: int("basketCount"),
  // remainingBaskets tracks how many baskets are left after partial packing
  remainingBaskets: int("remainingBaskets"),
  storageLocation: varchar("storageLocation", { length: 100 }),
  status: mysqlEnum("status", ["available", "partially_consumed", "fully_consumed", "in_packing", "deducted", "cancelled", "damaged"]).default("available").notNull(),
  notes: text("notes"),
  createdByUserId: int("createdByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type HarvestedInventory = typeof harvestedInventory.$inferSelect;
export type InsertHarvestedInventory = typeof harvestedInventory.$inferInsert;

export const packedInventory = mysqlTable("packed_inventory", {
  id: int("id").autoincrement().primaryKey(),
  barcode: varchar("barcode", { length: 50 }).notNull().unique(),
  batchNumber: varchar("batchNumber", { length: 50 }).notNull(),
  packingDate: date("packingDate").notNull(),
  packingTime: varchar("packingTime", { length: 10 }),
  harvestWave: int("harvestWave").notNull(),
  categoryId: int("categoryId").notNull(),
  sizeId: int("sizeId"),
  packagingTypeId: int("packagingTypeId").notNull(),
  // Product type: the 4 factory products
  productType: mysqlEnum("productType", ["white_basket", "brown_basket", "mix", "filling"]),
  // Link to product catalog entry (for Rivuchit export)
  productCatalogId: int("productCatalogId"),
  packedWeight: decimal("packedWeight", { precision: 10, scale: 2 }).notNull(),
  // unitCount = number of selling cartons created
  unitCount: int("unitCount").notNull(),
  // basketCount = baskets inside (8 for basket/mix cartons, null for filling)
  basketCount: int("basketCount"),
  // packerId = employee who packed this
  packerId: int("packerId"),
  storageLocation: varchar("storageLocation", { length: 100 }),
  expiryDate: date("expiryDate"),
  status: mysqlEnum("status", ["available", "shipped", "damaged", "cancelled"]).default("available").notNull(),
  notes: text("notes"),
  createdByUserId: int("createdByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PackedInventory = typeof packedInventory.$inferSelect;
export type InsertPackedInventory = typeof packedInventory.$inferInsert;

// Links packed items to their harvested source items
export const packedSourceLinks = mysqlTable("packed_source_links", {
  id: int("id").autoincrement().primaryKey(),
  packedInventoryId: int("packedInventoryId").notNull(),
  harvestedInventoryId: int("harvestedInventoryId").notNull(),
  weightUsed: decimal("weightUsed", { precision: 10, scale: 2 }).notNull(),
  basketsUsed: int("basketsUsed"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PackedSourceLink = typeof packedSourceLinks.$inferSelect;
export type InsertPackedSourceLink = typeof packedSourceLinks.$inferInsert;

export const inventoryMovements = mysqlTable("inventory_movements", {
  id: int("id").autoincrement().primaryKey(),
  movementDate: date("movementDate").notNull(),
  movementTime: varchar("movementTime", { length: 10 }),
  movementType: mysqlEnum("movementType", [
    "harvest_intake",
    "move_to_packing",
    "consume_for_packing",
    "packed_intake",
    "outbound",
    "downgrade",
    "correction",
    "cancellation",
    "waste",
  ]).notNull(),
  inventoryType: mysqlEnum("inventoryType", ["harvested", "packed"]).notNull(),
  itemId: int("itemId").notNull(),
  itemBarcode: varchar("itemBarcode", { length: 50 }),
  weight: decimal("weight", { precision: 10, scale: 2 }),
  quantity: int("quantity"),
  // For downgrade movements: points to the new inventory item created
  resultingInventoryId: int("resultingInventoryId"),
  userId: int("userId"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type InventoryMovement = typeof inventoryMovements.$inferSelect;
export type InsertInventoryMovement = typeof inventoryMovements.$inferInsert;

export const barcodeSequences = mysqlTable("barcode_sequences", {
  id: int("id").autoincrement().primaryKey(),
  prefix: varchar("prefix", { length: 20 }).notNull().unique(),
  dateCode: varchar("dateCode", { length: 10 }).notNull(),
  lastSequence: int("lastSequence").default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BarcodeSequence = typeof barcodeSequences.$inferSelect;
export type InsertBarcodeSequence = typeof barcodeSequences.$inferInsert;
