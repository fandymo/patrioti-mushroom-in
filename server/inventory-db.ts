import { eq, and, sql, desc, asc, SQL, inArray } from "drizzle-orm";
import {
  harvestedInventory, InsertHarvestedInventory,
  packedInventory, InsertPackedInventory,
  packedSourceLinks, InsertPackedSourceLink,
  inventoryMovements, InsertInventoryMovement,
  barcodeSequences,
  harvestRecords,
  employees, rooms, categories, sizes, packagingTypes,
} from "../drizzle/schema";
import { getDb } from "./db";

// ============ BARCODE GENERATION ============

export async function getNextBarcode(prefix: string, dateCode: string, extra: string): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const key = `${prefix}-${dateCode}-${extra}`;
  // Upsert the sequence
  await db.insert(barcodeSequences).values({
    prefix: key,
    dateCode,
    lastSequence: 1,
  }).onDuplicateKeyUpdate({
    set: { lastSequence: sql`${barcodeSequences.lastSequence} + 1` },
  });

  const result = await db.select({ lastSequence: barcodeSequences.lastSequence })
    .from(barcodeSequences)
    .where(eq(barcodeSequences.prefix, key))
    .limit(1);

  const seq = result[0]?.lastSequence ?? 1;
  const seqStr = String(seq).padStart(4, "0");
  return `${prefix}-${dateCode}-${extra}-${seqStr}`;
}

export function formatDateCode(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}${mm}${dd}`;
}

// ============ HARVESTED INVENTORY ============

export async function createHarvestedItem(data: Record<string, any>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(harvestedInventory).values(data as any);
  return { id: result[0].insertId };
}

export async function getHarvestedItem(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(harvestedInventory).where(eq(harvestedInventory.id, id)).limit(1);
  return result[0];
}

export async function getHarvestedItemByBarcode(barcode: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(harvestedInventory).where(eq(harvestedInventory.barcode, barcode)).limit(1);
  return result[0];
}

export async function updateHarvestedItem(id: number, data: Record<string, any>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(harvestedInventory).set(data as any).where(eq(harvestedInventory.id, id));
}

export async function listHarvestedInventory(filters: {
  startDate?: string;
  endDate?: string;
  roomId?: number;
  employeeId?: number;
  harvestWave?: number;
  batchNumber?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };

  const conditions: SQL[] = [];
  if (filters.startDate) conditions.push(sql`${harvestedInventory.harvestDate} >= ${filters.startDate}`);
  if (filters.endDate) conditions.push(sql`${harvestedInventory.harvestDate} <= ${filters.endDate}`);
  if (filters.roomId) conditions.push(eq(harvestedInventory.roomId, filters.roomId));
  if (filters.employeeId) conditions.push(eq(harvestedInventory.employeeId, filters.employeeId));
  if (filters.harvestWave) conditions.push(eq(harvestedInventory.harvestWave, filters.harvestWave));
  if (filters.batchNumber) conditions.push(eq(harvestedInventory.batchNumber, filters.batchNumber));
  if (filters.status) conditions.push(eq(harvestedInventory.status, filters.status as any));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const items = await db.select().from(harvestedInventory)
    .where(whereClause)
    .orderBy(desc(harvestedInventory.createdAt))
    .limit(filters.limit ?? 100)
    .offset(filters.offset ?? 0);

  const countResult = await db.select({ count: sql<number>`count(*)` }).from(harvestedInventory).where(whereClause);
  const total = countResult[0]?.count ?? 0;

  return { items, total };
}

// ============ PACKED INVENTORY ============

export async function createPackedItem(data: Record<string, any>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(packedInventory).values(data as any);
  return { id: result[0].insertId };
}

export async function getPackedItem(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(packedInventory).where(eq(packedInventory.id, id)).limit(1);
  return result[0];
}

export async function getPackedItemByBarcode(barcode: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(packedInventory).where(eq(packedInventory.barcode, barcode)).limit(1);
  return result[0];
}

export async function updatePackedItem(id: number, data: Record<string, any>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(packedInventory).set(data as any).where(eq(packedInventory.id, id));
}

export async function listPackedInventory(filters: {
  startDate?: string;
  endDate?: string;
  categoryId?: number;
  packagingTypeId?: number;
  harvestWave?: number;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };

  const conditions: SQL[] = [];
  if (filters.startDate) conditions.push(sql`${packedInventory.packingDate} >= ${filters.startDate}`);
  if (filters.endDate) conditions.push(sql`${packedInventory.packingDate} <= ${filters.endDate}`);
  if (filters.categoryId) conditions.push(eq(packedInventory.categoryId, filters.categoryId));
  if (filters.packagingTypeId) conditions.push(eq(packedInventory.packagingTypeId, filters.packagingTypeId));
  if (filters.harvestWave) conditions.push(eq(packedInventory.harvestWave, filters.harvestWave));
  if (filters.status) conditions.push(eq(packedInventory.status, filters.status as any));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const items = await db.select().from(packedInventory)
    .where(whereClause)
    .orderBy(desc(packedInventory.createdAt))
    .limit(filters.limit ?? 100)
    .offset(filters.offset ?? 0);

  const countResult = await db.select({ count: sql<number>`count(*)` }).from(packedInventory).where(whereClause);
  const total = countResult[0]?.count ?? 0;

  return { items, total };
}

// ============ PACKED SOURCE LINKS ============

export async function createPackedSourceLink(data: { packedInventoryId: number; harvestedInventoryId: number; weightUsed: string; basketsUsed?: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(packedSourceLinks).values(data as any);
}

export async function getSourceLinksForPacked(packedId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: packedSourceLinks.id,
    harvestedInventoryId: packedSourceLinks.harvestedInventoryId,
    weightUsed: packedSourceLinks.weightUsed,
    basketsUsed: packedSourceLinks.basketsUsed,
    harvestedBarcode: harvestedInventory.barcode,
    harvestedBatch: harvestedInventory.batchNumber,
    harvestDate: harvestedInventory.harvestDate,
    harvestWave: harvestedInventory.harvestWave,
    employeeName: employees.name,
    roomName: rooms.name,
  }).from(packedSourceLinks)
    .innerJoin(harvestedInventory, eq(packedSourceLinks.harvestedInventoryId, harvestedInventory.id))
    .innerJoin(employees, eq(harvestedInventory.employeeId, employees.id))
    .innerJoin(rooms, eq(harvestedInventory.roomId, rooms.id))
    .where(eq(packedSourceLinks.packedInventoryId, packedId));
}

// ============ INVENTORY MOVEMENTS ============

export async function createMovement(data: Record<string, any>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(inventoryMovements).values(data as any);
}

export async function listMovements(filters: {
  startDate?: string;
  endDate?: string;
  movementType?: string;
  inventoryType?: string;
  itemBarcode?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return { movements: [], total: 0 };

  const conditions: SQL[] = [];
  if (filters.startDate) conditions.push(sql`${inventoryMovements.movementDate} >= ${filters.startDate}`);
  if (filters.endDate) conditions.push(sql`${inventoryMovements.movementDate} <= ${filters.endDate}`);
  if (filters.movementType) conditions.push(eq(inventoryMovements.movementType, filters.movementType as any));
  if (filters.inventoryType) conditions.push(eq(inventoryMovements.inventoryType, filters.inventoryType as any));
  if (filters.itemBarcode) conditions.push(eq(inventoryMovements.itemBarcode, filters.itemBarcode));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const movements = await db.select().from(inventoryMovements)
    .where(whereClause)
    .orderBy(desc(inventoryMovements.createdAt))
    .limit(filters.limit ?? 200)
    .offset(filters.offset ?? 0);

  const countResult = await db.select({ count: sql<number>`count(*)` }).from(inventoryMovements).where(whereClause);
  const total = countResult[0]?.count ?? 0;

  return { movements, total };
}

// ============ INVENTORY SUMMARY ============

export async function getInventorySummary() {
  const db = await getDb();
  if (!db) return { harvestedAvailable: 0, harvestedWeight: "0", packedAvailable: 0, packedWeight: "0", packedShipped: 0 };

  const harvested = await db.select({
    count: sql<number>`COUNT(*)`,
    totalWeight: sql<string>`COALESCE(SUM(${harvestedInventory.remainingWeight}), 0)`,
  }).from(harvestedInventory)
    .where(sql`${harvestedInventory.status} IN ('available', 'partially_consumed')`);

  const packed = await db.select({
    count: sql<number>`COUNT(*)`,
    totalWeight: sql<string>`COALESCE(SUM(${packedInventory.packedWeight}), 0)`,
  }).from(packedInventory)
    .where(eq(packedInventory.status, "available"));

  const shipped = await db.select({
    count: sql<number>`COUNT(*)`,
  }).from(packedInventory)
    .where(eq(packedInventory.status, "shipped"));

  return {
    harvestedAvailable: harvested[0]?.count ?? 0,
    harvestedWeight: harvested[0]?.totalWeight ?? "0",
    packedAvailable: packed[0]?.count ?? 0,
    packedWeight: packed[0]?.totalWeight ?? "0",
    packedShipped: shipped[0]?.count ?? 0,
  };
}

// ============ TRACEABILITY ============

export async function getTraceabilityForPacked(packedId: number) {
  const db = await getDb();
  if (!db) return null;

  const packed = await db.select({
    id: packedInventory.id,
    barcode: packedInventory.barcode,
    batchNumber: packedInventory.batchNumber,
    packingDate: packedInventory.packingDate,
    packingTime: packedInventory.packingTime,
    harvestWave: packedInventory.harvestWave,
    productType: packedInventory.productType,
    categoryName: categories.name,
    sizeName: sql<string>`COALESCE(${sizes.name}, '')`.as('sizeName'),
    packagingName: packagingTypes.name,
    packedWeight: packedInventory.packedWeight,
    unitCount: packedInventory.unitCount,
    basketCount: packedInventory.basketCount,
    status: packedInventory.status,
  }).from(packedInventory)
    .innerJoin(categories, eq(packedInventory.categoryId, categories.id))
    .leftJoin(sizes, eq(packedInventory.sizeId, sizes.id))
    .innerJoin(packagingTypes, eq(packedInventory.packagingTypeId, packagingTypes.id))
    .where(eq(packedInventory.id, packedId))
    .limit(1);

  if (!packed[0]) return null;

  const sources = await getSourceLinksForPacked(packedId);

  const movements = await db.select().from(inventoryMovements)
    .where(and(
      eq(inventoryMovements.itemId, packedId),
      eq(inventoryMovements.inventoryType, "packed"),
    ))
    .orderBy(asc(inventoryMovements.createdAt));

  return { packed: packed[0], sources, movements };
}

// ============ WEIGHING STATION ============

/**
 * Atomically creates a harvestRecord (status=draft) AND a harvestedInventory item linked to it.
 * The weigher at the cold room door calls this once per carton batch.
 * Returns { harvestRecordId, harvestedInventoryId, barcode }
 */
export async function createWeighingEntry(
  data: {
    workDate: string;
    workTime?: string;
    employeeId: number;
    roomId: number;
    shiftId: number;
    packagingTypeId: number;
    categoryId: number;
    sizeId?: number;
    harvestWave: number;
    growCycleId?: number;
    boxCount: number;
    basketCount?: number;
    totalWeight: string;
    storageLocation?: string;
    notes?: string;
  },
  createdByUserId: number
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const boxCount = data.boxCount;
  const totalWeight = parseFloat(String(data.totalWeight));
  const avgWeightPerBox = boxCount > 0 ? (totalWeight / boxCount).toFixed(3) : "0";

  // Auto-calculate basketCount as boxCount × 6 if not provided
  const basketCount = data.basketCount ?? boxCount * 6;

  // 1. Create the harvest record
  const hrResult = await db.insert(harvestRecords).values({
    workDate: data.workDate,
    workTime: data.workTime ?? null,
    employeeId: data.employeeId,
    roomId: data.roomId,
    shiftId: data.shiftId,
    packagingTypeId: data.packagingTypeId,
    categoryId: data.categoryId,
    sizeId: data.sizeId ?? null,
    harvestWave: data.harvestWave,
    growCycleId: data.growCycleId ?? null,
    boxCount,
    totalWeight: data.totalWeight,
    avgWeightPerBox,
    notes: data.notes ?? null,
    status: "draft",
    createdByUserId,
  } as any);

  const harvestRecordId = hrResult[0].insertId;

  // 2. Generate H-barcode: H-YYMMDD-RR-WW-SSSS
  const dateCode = formatDateCode(data.workDate);
  const roomCode = String(data.roomId).padStart(2, "0");
  const waveCode = String(data.harvestWave).padStart(2, "0");
  const barcode = await getNextBarcode("H", dateCode, `${roomCode}-${waveCode}`);
  const batchNumber = `H-${dateCode}-${roomCode}`;

  const weight = data.totalWeight;

  // 3. Create the harvestedInventory item linked to the harvest record
  const hiResult = await db.insert(harvestedInventory).values({
    barcode,
    batchNumber,
    harvestDate: data.workDate,
    harvestTime: data.workTime ?? null,
    roomId: data.roomId,
    harvestWave: data.harvestWave,
    employeeId: data.employeeId,
    categoryId: data.categoryId,
    sizeId: data.sizeId ?? null,
    harvestRecordId,
    originalWeight: weight,
    consumedWeight: "0",
    remainingWeight: weight,
    boxCount,
    basketCount,
    remainingBaskets: basketCount,
    storageLocation: data.storageLocation ?? null,
    notes: data.notes ?? null,
    status: "available",
    createdByUserId,
  } as any);

  const harvestedInventoryId = hiResult[0].insertId;

  // 4. Record harvest_intake movement
  await db.insert(inventoryMovements).values({
    movementDate: data.workDate,
    movementTime: data.workTime ?? null,
    movementType: "harvest_intake",
    inventoryType: "harvested",
    itemId: harvestedInventoryId,
    itemBarcode: barcode,
    weight,
    quantity: boxCount,
    userId: createdByUserId,
    notes: data.notes ?? null,
  } as any);

  return { harvestRecordId, harvestedInventoryId, barcode };
}

// ============ PACKING — MOVE TO PACKING AREA ============

/**
 * Marks a harvestedInventory item as in_packing (reserved for the packing floor).
 */
export async function moveToPackingArea(harvestedInventoryId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const item = await getHarvestedItem(harvestedInventoryId);
  if (!item) throw new Error("Harvested inventory item not found");

  await db.update(harvestedInventory)
    .set({ status: "in_packing" } as any)
    .where(eq(harvestedInventory.id, harvestedInventoryId));

  const today = new Date().toISOString().split("T")[0];
  const timeNow = new Date().toTimeString().slice(0, 5);

  await db.insert(inventoryMovements).values({
    movementDate: today,
    movementTime: timeNow,
    movementType: "move_to_packing",
    inventoryType: "harvested",
    itemId: harvestedInventoryId,
    itemBarcode: item.barcode,
    weight: String(item.remainingWeight),
    quantity: item.remainingBaskets ?? item.basketCount ?? null,
    userId,
  } as any);
}

// ============ PACKING — CREATE PACKING RESULT ============

type ProductType = 'white_basket' | 'brown_basket' | 'mix' | 'filling';

function productTypeToCode(pt: ProductType): string {
  switch (pt) {
    case 'white_basket': return 'WB';
    case 'brown_basket': return 'BB';
    case 'mix': return 'MX';
    case 'filling': return 'FL';
  }
}

/**
 * Full packing transaction:
 * - Creates a packedInventory record with productType, basketCount, packerId
 * - For each source: creates a packedSourceLink, deducts weight+baskets from harvestedInventory
 * - Updates harvestedInventory status based on remaining weight
 * - Records consume_for_packing movement per source and packed_intake for the result
 * Returns { id, barcode }
 */
export async function createPackingResult(data: {
  packingDate: string;
  packingTime?: string;
  productType: ProductType;
  packagingTypeId: number;
  categoryId: number;
  sizeId?: number;
  harvestWave: number;
  packedWeight: string;
  unitCount: number;
  basketCount?: number;
  packerId?: number;
  productCatalogId?: number;
  expiryDate?: string;
  storageLocation?: string;
  notes?: string;
  sources: Array<{ harvestedInventoryId: number; weightUsed: string; basketsUsed?: number }>;
  createdByUserId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  // Generate P-barcode: P-YYMMDD-PT-SSSS
  const dateCode = formatDateCode(data.packingDate);
  const ptCode = productTypeToCode(data.productType);
  const barcode = await getNextBarcode("P", dateCode, ptCode);
  const batchNumber = `P-${dateCode}-${ptCode}`;

  // Create packed inventory record
  const packResult = await db.insert(packedInventory).values({
    barcode,
    batchNumber,
    packingDate: data.packingDate,
    packingTime: data.packingTime ?? null,
    harvestWave: data.harvestWave,
    categoryId: data.categoryId,
    sizeId: data.sizeId ?? null,
    packagingTypeId: data.packagingTypeId,
    productType: data.productType,
    packedWeight: data.packedWeight,
    unitCount: data.unitCount,
    basketCount: data.basketCount ?? null,
    packerId: data.packerId ?? null,
    productCatalogId: data.productCatalogId ?? null,
    storageLocation: data.storageLocation ?? null,
    expiryDate: data.expiryDate ?? null,
    notes: data.notes ?? null,
    status: "available",
    createdByUserId: data.createdByUserId,
  } as any);

  const packedId = packResult[0].insertId;

  // Process each source
  for (const src of data.sources) {
    const sourceItem = await getHarvestedItem(src.harvestedInventoryId);
    if (!sourceItem) throw new Error(`Source harvested item ${src.harvestedInventoryId} not found`);

    const weightUsed = parseFloat(src.weightUsed);
    const currentRemaining = parseFloat(String(sourceItem.remainingWeight));
    const currentConsumed = parseFloat(String(sourceItem.consumedWeight));

    const newConsumed = (currentConsumed + weightUsed).toFixed(2);
    const newRemaining = Math.max(0, currentRemaining - weightUsed).toFixed(2);

    // Update basket counts if provided
    let remainingBaskets = sourceItem.remainingBaskets;
    if (src.basketsUsed !== undefined && remainingBaskets !== null && remainingBaskets !== undefined) {
      remainingBaskets = Math.max(0, remainingBaskets - src.basketsUsed);
    }

    // Determine new status
    const newRemainingNum = parseFloat(newRemaining);
    let newStatus: string;
    if (newRemainingNum <= 0.01) {
      newStatus = "fully_consumed";
    } else {
      // Check if there are leftover baskets (< 8 for a full carton) — stays as partially_consumed
      newStatus = "partially_consumed";
    }

    await db.update(harvestedInventory).set({
      consumedWeight: newConsumed,
      remainingWeight: newRemaining,
      remainingBaskets: remainingBaskets ?? null,
      status: newStatus,
    } as any).where(eq(harvestedInventory.id, src.harvestedInventoryId));

    // Create source link
    await db.insert(packedSourceLinks).values({
      packedInventoryId: packedId,
      harvestedInventoryId: src.harvestedInventoryId,
      weightUsed: src.weightUsed,
      basketsUsed: src.basketsUsed ?? null,
    } as any);

    // Record consume_for_packing movement
    await db.insert(inventoryMovements).values({
      movementDate: data.packingDate,
      movementTime: data.packingTime ?? null,
      movementType: "consume_for_packing",
      inventoryType: "harvested",
      itemId: src.harvestedInventoryId,
      itemBarcode: sourceItem.barcode,
      weight: src.weightUsed,
      quantity: src.basketsUsed ?? null,
      userId: data.createdByUserId,
      notes: `Packed into ${barcode}`,
    } as any);
  }

  // Record packed_intake movement
  await db.insert(inventoryMovements).values({
    movementDate: data.packingDate,
    movementTime: data.packingTime ?? null,
    movementType: "packed_intake",
    inventoryType: "packed",
    itemId: packedId,
    itemBarcode: barcode,
    weight: data.packedWeight,
    quantity: data.unitCount,
    userId: data.createdByUserId,
  } as any);

  return { id: packedId, barcode };
}

// ============ DOWNGRADE ============

/**
 * During packing, bad mushrooms found → deducts weight from source, creates a new
 * harvestedInventory item with small size and status=available.
 * Records a downgrade movement with resultingInventoryId pointing to the new item.
 * Returns { id, barcode } of the new downgraded item.
 */
export async function createDowngrade(data: {
  sourceHarvestedInventoryId: number;
  downgradeDate: string;
  downgradeWeight: string;
  reason: string;
  roomId: number;
  harvestWave: number;
  employeeId: number;
  sizeId: number;
  categoryId: number;
  userId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const sourceItem = await getHarvestedItem(data.sourceHarvestedInventoryId);
  if (!sourceItem) throw new Error("Source harvested item not found");

  const downgradeWeight = parseFloat(data.downgradeWeight);
  const currentRemaining = parseFloat(String(sourceItem.remainingWeight));
  const currentConsumed = parseFloat(String(sourceItem.consumedWeight));

  const newConsumed = (currentConsumed + downgradeWeight).toFixed(2);
  const newRemaining = Math.max(0, currentRemaining - downgradeWeight).toFixed(2);
  const newRemainingNum = parseFloat(newRemaining);
  const newStatus = newRemainingNum <= 0.01 ? "fully_consumed" : "partially_consumed";

  // Deduct from source
  await db.update(harvestedInventory).set({
    consumedWeight: newConsumed,
    remainingWeight: newRemaining,
    status: newStatus,
  } as any).where(eq(harvestedInventory.id, data.sourceHarvestedInventoryId));

  // Generate new H-barcode for the downgraded item
  const dateCode = formatDateCode(data.downgradeDate);
  const roomCode = String(data.roomId).padStart(2, "0");
  const waveCode = String(data.harvestWave).padStart(2, "0");
  const newBarcode = await getNextBarcode("H", dateCode, `${roomCode}-${waveCode}`);
  const newBatchNumber = `H-${dateCode}-${roomCode}`;

  // Create the downgraded harvested inventory item
  const newItemResult = await db.insert(harvestedInventory).values({
    barcode: newBarcode,
    batchNumber: newBatchNumber,
    harvestDate: data.downgradeDate,
    roomId: data.roomId,
    harvestWave: data.harvestWave,
    employeeId: data.employeeId,
    categoryId: data.categoryId,
    sizeId: data.sizeId,
    harvestRecordId: sourceItem.harvestRecordId ?? null,
    originalWeight: data.downgradeWeight,
    consumedWeight: "0",
    remainingWeight: data.downgradeWeight,
    boxCount: 0,
    basketCount: null,
    remainingBaskets: null,
    notes: `Downgraded from ${sourceItem.barcode}. Reason: ${data.reason}`,
    status: "available",
    createdByUserId: data.userId,
  } as any);

  const newItemId = newItemResult[0].insertId;

  // Record downgrade movement on the source item
  await db.insert(inventoryMovements).values({
    movementDate: data.downgradeDate,
    movementType: "downgrade",
    inventoryType: "harvested",
    itemId: data.sourceHarvestedInventoryId,
    itemBarcode: sourceItem.barcode,
    weight: data.downgradeWeight,
    resultingInventoryId: newItemId,
    userId: data.userId,
    notes: data.reason,
  } as any);

  // Record harvest_intake movement for the new downgraded item
  await db.insert(inventoryMovements).values({
    movementDate: data.downgradeDate,
    movementType: "harvest_intake",
    inventoryType: "harvested",
    itemId: newItemId,
    itemBarcode: newBarcode,
    weight: data.downgradeWeight,
    userId: data.userId,
    notes: `Downgraded from ${sourceItem.barcode}`,
  } as any);

  return { id: newItemId, barcode: newBarcode };
}

// ============ COLD ROOM SUMMARY ============

/**
 * Returns a summary of what's currently in the cold room:
 * - raw: harvestedInventory items that are available/partially_consumed/in_packing
 * - finished: packedInventory items that are available
 */
export async function getColdRoomSummary() {
  const db = await getDb();
  if (!db) return { raw: [], finished: [] };

  // Raw items — join with categories, sizes, employees, rooms
  const rawItems = await db.select({
    id: harvestedInventory.id,
    barcode: harvestedInventory.barcode,
    harvestDate: harvestedInventory.harvestDate,
    harvestWave: harvestedInventory.harvestWave,
    status: harvestedInventory.status,
    originalWeight: harvestedInventory.originalWeight,
    remainingWeight: harvestedInventory.remainingWeight,
    basketCount: harvestedInventory.basketCount,
    remainingBaskets: harvestedInventory.remainingBaskets,
    boxCount: harvestedInventory.boxCount,
    storageLocation: harvestedInventory.storageLocation,
    categoryId: harvestedInventory.categoryId,
    categoryName: categories.name,
    sizeId: harvestedInventory.sizeId,
    sizeName: sql<string>`COALESCE(${sizes.name}, '')`.as('sizeName'),
    employeeId: harvestedInventory.employeeId,
    employeeName: employees.name,
    roomId: harvestedInventory.roomId,
    roomName: rooms.name,
  }).from(harvestedInventory)
    .innerJoin(categories, eq(harvestedInventory.categoryId, categories.id))
    .leftJoin(sizes, eq(harvestedInventory.sizeId, sizes.id))
    .innerJoin(employees, eq(harvestedInventory.employeeId, employees.id))
    .innerJoin(rooms, eq(harvestedInventory.roomId, rooms.id))
    .where(sql`${harvestedInventory.status} IN ('available', 'partially_consumed', 'in_packing')`)
    .orderBy(desc(harvestedInventory.harvestDate), harvestedInventory.harvestWave);

  // Aggregate raw items by category+size
  type RawGroup = {
    categoryId: number;
    categoryName: string;
    sizeId: number | null;
    sizeName: string;
    totalWeight: number;
    totalBaskets: number;
    itemCount: number;
    items: typeof rawItems;
  };

  const rawGroupMap = new Map<string, RawGroup>();
  for (const item of rawItems) {
    const key = `${item.categoryId}-${item.sizeId ?? 'null'}`;
    if (!rawGroupMap.has(key)) {
      rawGroupMap.set(key, {
        categoryId: item.categoryId,
        categoryName: item.categoryName,
        sizeId: item.sizeId ?? null,
        sizeName: item.sizeName,
        totalWeight: 0,
        totalBaskets: 0,
        itemCount: 0,
        items: [],
      });
    }
    const group = rawGroupMap.get(key)!;
    group.totalWeight += parseFloat(String(item.remainingWeight ?? 0));
    group.totalBaskets += item.remainingBaskets ?? item.basketCount ?? 0;
    group.itemCount += 1;
    group.items.push(item);
  }

  const raw = Array.from(rawGroupMap.values()).map(g => ({
    ...g,
    totalWeight: g.totalWeight.toFixed(2),
  }));

  // Finished items — packedInventory where status = available
  const finishedItems = await db.select({
    id: packedInventory.id,
    barcode: packedInventory.barcode,
    packingDate: packedInventory.packingDate,
    harvestWave: packedInventory.harvestWave,
    productType: packedInventory.productType,
    packedWeight: packedInventory.packedWeight,
    unitCount: packedInventory.unitCount,
    basketCount: packedInventory.basketCount,
    storageLocation: packedInventory.storageLocation,
    expiryDate: packedInventory.expiryDate,
    status: packedInventory.status,
  }).from(packedInventory)
    .where(eq(packedInventory.status, "available"))
    .orderBy(desc(packedInventory.packingDate));

  // Aggregate finished items by productType
  type FinishedGroup = {
    productType: string | null;
    totalWeight: number;
    totalCartons: number;
    itemCount: number;
    items: typeof finishedItems;
  };

  const finishedGroupMap = new Map<string, FinishedGroup>();
  for (const item of finishedItems) {
    const key = item.productType ?? 'unknown';
    if (!finishedGroupMap.has(key)) {
      finishedGroupMap.set(key, {
        productType: item.productType,
        totalWeight: 0,
        totalCartons: 0,
        itemCount: 0,
        items: [],
      });
    }
    const group = finishedGroupMap.get(key)!;
    group.totalWeight += parseFloat(String(item.packedWeight ?? 0));
    group.totalCartons += item.unitCount ?? 0;
    group.itemCount += 1;
    group.items.push(item);
  }

  const finished = Array.from(finishedGroupMap.values()).map(g => ({
    ...g,
    totalWeight: g.totalWeight.toFixed(2),
  }));

  return { raw, finished };
}

// ============ YIELD SUMMARY ============

/**
 * Calculates yield efficiency per product type for a date range.
 * Compares harvestedInventory originalWeight against weight actually consumed via packedSourceLinks.
 * Returns per product type: harvestedWeight, packedWeight (from source links), lossWeight, yieldPercent
 */
export async function getYieldSummary(startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return [];

  // Get all harvested items in the date range with their category/size
  const harvestedItems = await db.select({
    id: harvestedInventory.id,
    originalWeight: harvestedInventory.originalWeight,
    consumedWeight: harvestedInventory.consumedWeight,
    categoryName: categories.name,
    sizeName: sql<string>`COALESCE(${sizes.name}, '')`.as('sizeName'),
  }).from(harvestedInventory)
    .innerJoin(categories, eq(harvestedInventory.categoryId, categories.id))
    .leftJoin(sizes, eq(harvestedInventory.sizeId, sizes.id))
    .where(and(
      sql`${harvestedInventory.harvestDate} >= ${startDate}`,
      sql`${harvestedInventory.harvestDate} <= ${endDate}`
    ));

  // Get packed items in the date range with their product type
  const packedItems = await db.select({
    id: packedInventory.id,
    productType: packedInventory.productType,
    packedWeight: packedInventory.packedWeight,
  }).from(packedInventory)
    .where(and(
      sql`${packedInventory.packingDate} >= ${startDate}`,
      sql`${packedInventory.packingDate} <= ${endDate}`
    ));

  // Get source links to map packed weight back to harvested sources
  const packedIds = packedItems.map(p => p.id);
  let sourceLinks: Array<{ packedInventoryId: number; harvestedInventoryId: number; weightUsed: string }> = [];
  if (packedIds.length > 0) {
    sourceLinks = await db.select({
      packedInventoryId: packedSourceLinks.packedInventoryId,
      harvestedInventoryId: packedSourceLinks.harvestedInventoryId,
      weightUsed: packedSourceLinks.weightUsed,
    }).from(packedSourceLinks)
      .where(inArray(packedSourceLinks.packedInventoryId, packedIds));
  }

  // Build a map from packedInventoryId -> productType
  const packedProductTypeMap = new Map<number, string>();
  for (const p of packedItems) {
    packedProductTypeMap.set(p.id, p.productType ?? 'unknown');
  }

  // Aggregate: per productType, sum weightUsed from source links
  type YieldGroup = {
    productType: string;
    harvestedWeight: number;
    packedWeight: number;
  };

  const yieldMap = new Map<string, YieldGroup>();

  // Sum harvested weight by category+size as a label (the "product type" for raw harvested)
  for (const hi of harvestedItems) {
    const label = hi.sizeName ? `${hi.categoryName} (${hi.sizeName})` : hi.categoryName;
    if (!yieldMap.has(label)) {
      yieldMap.set(label, { productType: label, harvestedWeight: 0, packedWeight: 0 });
    }
    yieldMap.get(label)!.harvestedWeight += parseFloat(String(hi.originalWeight ?? 0));
  }

  // Sum packed weight by productType
  const packedByType = new Map<string, number>();
  for (const link of sourceLinks) {
    const pt = packedProductTypeMap.get(link.packedInventoryId) ?? 'unknown';
    packedByType.set(pt, (packedByType.get(pt) ?? 0) + parseFloat(String(link.weightUsed ?? 0)));
  }

  // Also add packed product types that may not exist yet in yieldMap
  for (const [pt, weight] of packedByType.entries()) {
    if (!yieldMap.has(pt)) {
      yieldMap.set(pt, { productType: pt, harvestedWeight: 0, packedWeight: 0 });
    }
    yieldMap.get(pt)!.packedWeight += weight;
  }

  return Array.from(yieldMap.values()).map(g => {
    const loss = Math.max(0, g.harvestedWeight - g.packedWeight);
    const yieldPercent = g.harvestedWeight > 0
      ? parseFloat(((g.packedWeight / g.harvestedWeight) * 100).toFixed(2))
      : 0;
    return {
      productType: g.productType,
      harvestedWeight: g.harvestedWeight.toFixed(2),
      packedWeight: g.packedWeight.toFixed(2),
      lossWeight: loss.toFixed(2),
      yieldPercent,
    };
  });
}
