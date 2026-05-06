import { eq, and, sql, desc, asc, SQL } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  employees, InsertEmployee,
  rooms, InsertRoom,
  packagingTypes, InsertPackagingType,
  categories, InsertCategory,
  shifts, InsertShift,
  harvestRecords, InsertHarvestRecord,
  auditLog, InsertAuditLog,
  sizes, InsertSize,
  growCycles, InsertGrowCycle,
  customers, InsertCustomer,
  deliveries, InsertDelivery,
  deliveryItems,
  packedInventory,
  productCatalog, InsertProductCatalog,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; } else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============ USERS ============
export async function listUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.lastSignedIn));
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function updateUserRole(id: number, role: 'user' | 'admin') {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(users).set({ role }).where(eq(users.id, id));
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0] ?? null;
}

export async function createUserByEmail(data: { name: string; email: string; role: 'user' | 'admin' }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Generate a placeholder openId that will be replaced when user logs in via OAuth
  const placeholderOpenId = `email_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const result = await db.insert(users).values({
    openId: placeholderOpenId,
    name: data.name,
    email: data.email,
    role: data.role,
    loginMethod: 'pending',
    lastSignedIn: new Date(),
  });
  return { id: result[0].insertId, openId: placeholderOpenId };
}

export async function mergeUserByEmail(existingUserId: number, oauthOpenId: string, oauthName: string | null, loginMethod: string | null) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(users).set({
    openId: oauthOpenId,
    name: oauthName,
    loginMethod: loginMethod,
    lastSignedIn: new Date(),
  }).where(eq(users.id, existingUserId));
}

export async function updateUserLastSignedIn(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, id));
}

export async function createUserWithPassword(data: { name: string; email: string; role: 'user' | 'admin'; passwordHash: string }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const openId = `local_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const result = await db.insert(users).values({
    openId,
    name: data.name,
    email: data.email,
    passwordHash: data.passwordHash,
    role: data.role,
    loginMethod: 'password',
    lastSignedIn: new Date(),
  });
  return { id: result[0].insertId, openId };
}

export async function updateUserPassword(id: number, passwordHash: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(users).set({ passwordHash, loginMethod: 'password' }).where(eq(users.id, id));
}

export async function deleteUser(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Unlink any employees linked to this user
  await db.update(employees).set({ userId: null }).where(eq(employees.userId, id));
  // Delete the user
  await db.delete(users).where(eq(users.id, id));
}

// ============ EMPLOYEES ============
export async function listEmployees(statusFilter?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions: SQL[] = [];
  if (statusFilter && (statusFilter === 'active' || statusFilter === 'inactive')) {
    conditions.push(eq(employees.status, statusFilter));
  }
  if (conditions.length > 0) {
    return db.select().from(employees).where(and(...conditions)).orderBy(asc(employees.name));
  }
  return db.select().from(employees).orderBy(asc(employees.name));
}

export async function getEmployee(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(employees).where(eq(employees.id, id)).limit(1);
  return result[0];
}

export async function createEmployee(data: Record<string, any>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(employees).values(data as any);
  return { id: result[0].insertId };
}

export async function updateEmployee(id: number, data: Record<string, any>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(employees).set(data as any).where(eq(employees.id, id));
}

export async function getEmployeeByUserId(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(employees).where(eq(employees.userId, userId)).limit(1);
  return result[0] ?? null;
}

export async function linkEmployeeToUser(employeeId: number, userId: number | null) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(employees).set({ userId } as any).where(eq(employees.id, employeeId));
}

// ============ ROOMS ============
export async function listRooms(statusFilter?: string) {
  const db = await getDb();
  if (!db) return [];
  if (statusFilter && (statusFilter === 'active' || statusFilter === 'inactive')) {
    return db.select().from(rooms).where(eq(rooms.status, statusFilter)).orderBy(asc(rooms.name));
  }
  return db.select().from(rooms).orderBy(asc(rooms.name));
}

export async function getRoom(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(rooms).where(eq(rooms.id, id)).limit(1);
  return result[0];
}

export async function createRoom(data: Omit<InsertRoom, 'id' | 'createdAt' | 'updatedAt'>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(rooms).values(data);
  return { id: result[0].insertId };
}

export async function updateRoom(id: number, data: Partial<InsertRoom>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(rooms).set(data).where(eq(rooms.id, id));
}

// ============ PACKAGING TYPES ============
export async function listPackagingTypes(statusFilter?: string) {
  const db = await getDb();
  if (!db) return [];
  if (statusFilter && (statusFilter === 'active' || statusFilter === 'inactive')) {
    return db.select().from(packagingTypes).where(eq(packagingTypes.status, statusFilter)).orderBy(asc(packagingTypes.name));
  }
  return db.select().from(packagingTypes).orderBy(asc(packagingTypes.name));
}

export async function createPackagingType(data: Omit<InsertPackagingType, 'id' | 'createdAt' | 'updatedAt'>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(packagingTypes).values(data);
  return { id: result[0].insertId };
}

export async function updatePackagingType(id: number, data: Partial<InsertPackagingType>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(packagingTypes).set(data).where(eq(packagingTypes.id, id));
}

// ============ CATEGORIES ============
export async function listCategories(statusFilter?: string) {
  const db = await getDb();
  if (!db) return [];
  if (statusFilter && (statusFilter === 'active' || statusFilter === 'inactive')) {
    return db.select().from(categories).where(eq(categories.status, statusFilter)).orderBy(asc(categories.name));
  }
  return db.select().from(categories).orderBy(asc(categories.name));
}

export async function createCategory(data: Omit<InsertCategory, 'id' | 'createdAt' | 'updatedAt'>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(categories).values(data);
  return { id: result[0].insertId };
}

export async function updateCategory(id: number, data: Partial<InsertCategory>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(categories).set(data).where(eq(categories.id, id));
}

// ============ SHIFTS ============
export async function listShifts(statusFilter?: string) {
  const db = await getDb();
  if (!db) return [];
  if (statusFilter && (statusFilter === 'active' || statusFilter === 'inactive')) {
    return db.select().from(shifts).where(eq(shifts.status, statusFilter)).orderBy(asc(shifts.name));
  }
  return db.select().from(shifts).orderBy(asc(shifts.name));
}

export async function createShift(data: Omit<InsertShift, 'id' | 'createdAt' | 'updatedAt'>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(shifts).values(data);
  return { id: result[0].insertId };
}

export async function updateShift(id: number, data: Partial<InsertShift>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(shifts).set(data).where(eq(shifts.id, id));
}

// ============ SIZES ============
export async function listSizes(statusFilter?: string) {
  const db = await getDb();
  if (!db) return [];
  if (statusFilter && (statusFilter === 'active' || statusFilter === 'inactive')) {
    return db.select().from(sizes).where(eq(sizes.status, statusFilter)).orderBy(asc(sizes.name));
  }
  return db.select().from(sizes).orderBy(asc(sizes.name));
}

export async function createSize(data: Omit<InsertSize, 'id' | 'createdAt' | 'updatedAt'>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(sizes).values(data);
  return { id: result[0].insertId };
}

export async function updateSize(id: number, data: Partial<InsertSize>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(sizes).set(data).where(eq(sizes.id, id));
}

// ============ HARVEST RECORDS ============
export async function listHarvestRecords(filters: {
  startDate?: string;
  endDate?: string;
  employeeId?: number;
  roomId?: number;
  shiftId?: number;
  packagingTypeId?: number;
  categoryId?: number;
  sizeId?: number;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return { records: [], total: 0 };

  const conditions: SQL[] = [];
  if (filters.startDate) conditions.push(sql`${harvestRecords.workDate} >= ${filters.startDate}`);
  if (filters.endDate) conditions.push(sql`${harvestRecords.workDate} <= ${filters.endDate}`);
  if (filters.employeeId) conditions.push(eq(harvestRecords.employeeId, filters.employeeId));
  if (filters.roomId) conditions.push(eq(harvestRecords.roomId, filters.roomId));
  if (filters.shiftId) conditions.push(eq(harvestRecords.shiftId, filters.shiftId));
  if (filters.packagingTypeId) conditions.push(eq(harvestRecords.packagingTypeId, filters.packagingTypeId));
  if (filters.categoryId) conditions.push(eq(harvestRecords.categoryId, filters.categoryId));
  if (filters.sizeId) conditions.push(eq(harvestRecords.sizeId, filters.sizeId));
  if (filters.status && (filters.status === 'draft' || filters.status === 'approved' || filters.status === 'cancelled')) {
    conditions.push(eq(harvestRecords.status, filters.status));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const records = await db.select().from(harvestRecords)
    .where(whereClause)
    .orderBy(desc(harvestRecords.workDate), desc(harvestRecords.createdAt))
    .limit(filters.limit ?? 100)
    .offset(filters.offset ?? 0);

  const countResult = await db.select({ count: sql<number>`count(*)` }).from(harvestRecords).where(whereClause);
  const total = countResult[0]?.count ?? 0;

  return { records, total };
}

export async function getHarvestRecord(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(harvestRecords).where(eq(harvestRecords.id, id)).limit(1);
  return result[0];
}

export async function createHarvestRecord(data: Record<string, any>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const boxCount = data.boxCount ?? 0;
  const totalWeight = parseFloat(String(data.totalWeight ?? 0));
  const avgWeight = boxCount > 0 ? (totalWeight / boxCount).toFixed(3) : "0";
  const result = await db.insert(harvestRecords).values({ ...data, avgWeightPerBox: avgWeight } as any);
  return { id: result[0].insertId };
}

export async function updateHarvestRecord(id: number, data: Record<string, any>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  if (data.boxCount !== undefined && data.totalWeight !== undefined && data.boxCount > 0) {
    data.avgWeightPerBox = (parseFloat(String(data.totalWeight)) / data.boxCount).toFixed(3);
  }
  await db.update(harvestRecords).set(data).where(eq(harvestRecords.id, id));
}

export async function approveHarvestRecord(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(harvestRecords).set({
    status: "approved",
    approvedByUserId: userId,
    approvedAt: new Date(),
  }).where(eq(harvestRecords.id, id));
}

export async function cancelHarvestRecord(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(harvestRecords).set({ status: "cancelled" }).where(eq(harvestRecords.id, id));
}

// ============ REPORTS ============
export async function getDailySummary(dateStr: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select({
    totalWeight: sql<string>`COALESCE(SUM(totalWeight), 0)`,
    totalBoxes: sql<number>`COALESCE(SUM(boxCount), 0)`,
    recordCount: sql<number>`COUNT(*)`,
    employeeCount: sql<number>`COUNT(DISTINCT employeeId)`,
  }).from(harvestRecords)
    .where(and(sql`${harvestRecords.workDate} = ${dateStr}`, eq(harvestRecords.status, "approved")));
  return result[0];
}

export async function getReportByEmployee(startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    employeeId: harvestRecords.employeeId,
    employeeName: employees.name,
    totalWeight: sql<string>`COALESCE(SUM(${harvestRecords.totalWeight}), 0)`,
    totalBoxes: sql<number>`COALESCE(SUM(${harvestRecords.boxCount}), 0)`,
    recordCount: sql<number>`COUNT(*)`,
    workDays: sql<number>`COUNT(DISTINCT ${harvestRecords.workDate})`,
    avgWeightPerDay: sql<string>`ROUND(COALESCE(SUM(${harvestRecords.totalWeight}) / NULLIF(COUNT(DISTINCT ${harvestRecords.workDate}), 0), 0), 2)`,
    avgWeightPerBox: sql<string>`ROUND(COALESCE(SUM(${harvestRecords.totalWeight}) / NULLIF(SUM(${harvestRecords.boxCount}), 0), 0), 3)`,
  }).from(harvestRecords)
    .innerJoin(employees, eq(harvestRecords.employeeId, employees.id))
    .where(and(
      sql`${harvestRecords.workDate} >= ${startDate}`,
      sql`${harvestRecords.workDate} <= ${endDate}`,
      eq(harvestRecords.status, "approved")
    ))
    .groupBy(harvestRecords.employeeId, employees.name)
    .orderBy(sql`SUM(${harvestRecords.totalWeight}) DESC`);
}

export async function getReportByRoom(startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    roomId: harvestRecords.roomId,
    roomName: rooms.name,
    totalWeight: sql<string>`COALESCE(SUM(${harvestRecords.totalWeight}), 0)`,
    totalBoxes: sql<number>`COALESCE(SUM(${harvestRecords.boxCount}), 0)`,
    recordCount: sql<number>`COUNT(*)`,
    employeeCount: sql<number>`COUNT(DISTINCT ${harvestRecords.employeeId})`,
  }).from(harvestRecords)
    .innerJoin(rooms, eq(harvestRecords.roomId, rooms.id))
    .where(and(
      sql`${harvestRecords.workDate} >= ${startDate}`,
      sql`${harvestRecords.workDate} <= ${endDate}`,
      eq(harvestRecords.status, "approved")
    ))
    .groupBy(harvestRecords.roomId, rooms.name)
    .orderBy(sql`SUM(${harvestRecords.totalWeight}) DESC`);
}

export async function getReportByShift(startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    shiftId: harvestRecords.shiftId,
    shiftName: shifts.name,
    totalWeight: sql<string>`COALESCE(SUM(${harvestRecords.totalWeight}), 0)`,
    totalBoxes: sql<number>`COALESCE(SUM(${harvestRecords.boxCount}), 0)`,
    recordCount: sql<number>`COUNT(*)`,
    employeeCount: sql<number>`COUNT(DISTINCT ${harvestRecords.employeeId})`,
  }).from(harvestRecords)
    .innerJoin(shifts, eq(harvestRecords.shiftId, shifts.id))
    .where(and(
      sql`${harvestRecords.workDate} >= ${startDate}`,
      sql`${harvestRecords.workDate} <= ${endDate}`,
      eq(harvestRecords.status, "approved")
    ))
    .groupBy(harvestRecords.shiftId, shifts.name)
    .orderBy(sql`SUM(${harvestRecords.totalWeight}) DESC`);
}

export async function getDashboardData(startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return null;

  const totals = await db.select({
    totalWeight: sql<string>`COALESCE(SUM(totalWeight), 0)`,
    totalBoxes: sql<number>`COALESCE(SUM(boxCount), 0)`,
    recordCount: sql<number>`COUNT(*)`,
  }).from(harvestRecords)
    .where(and(
      sql`${harvestRecords.workDate} >= ${startDate}`,
      sql`${harvestRecords.workDate} <= ${endDate}`,
      eq(harvestRecords.status, "approved")
    ));

  const topEmployees = await db.select({
    employeeId: harvestRecords.employeeId,
    employeeName: employees.name,
    totalWeight: sql<string>`SUM(${harvestRecords.totalWeight})`,
  }).from(harvestRecords)
    .innerJoin(employees, eq(harvestRecords.employeeId, employees.id))
    .where(and(
      sql`${harvestRecords.workDate} >= ${startDate}`,
      sql`${harvestRecords.workDate} <= ${endDate}`,
      eq(harvestRecords.status, "approved")
    ))
    .groupBy(harvestRecords.employeeId, employees.name)
    .orderBy(sql`SUM(${harvestRecords.totalWeight}) DESC`)
    .limit(5);

  const topRooms = await db.select({
    roomId: harvestRecords.roomId,
    roomName: rooms.name,
    totalWeight: sql<string>`SUM(${harvestRecords.totalWeight})`,
  }).from(harvestRecords)
    .innerJoin(rooms, eq(harvestRecords.roomId, rooms.id))
    .where(and(
      sql`${harvestRecords.workDate} >= ${startDate}`,
      sql`${harvestRecords.workDate} <= ${endDate}`,
      eq(harvestRecords.status, "approved")
    ))
    .groupBy(harvestRecords.roomId, rooms.name)
    .orderBy(sql`SUM(${harvestRecords.totalWeight}) DESC`)
    .limit(5);

  const byPackaging = await db.select({
    packagingTypeId: harvestRecords.packagingTypeId,
    packagingName: packagingTypes.name,
    totalWeight: sql<string>`SUM(${harvestRecords.totalWeight})`,
    totalBoxes: sql<number>`SUM(${harvestRecords.boxCount})`,
  }).from(harvestRecords)
    .innerJoin(packagingTypes, eq(harvestRecords.packagingTypeId, packagingTypes.id))
    .where(and(
      sql`${harvestRecords.workDate} >= ${startDate}`,
      sql`${harvestRecords.workDate} <= ${endDate}`,
      eq(harvestRecords.status, "approved")
    ))
    .groupBy(harvestRecords.packagingTypeId, packagingTypes.name);

  const byCategory = await db.select({
    categoryId: harvestRecords.categoryId,
    categoryName: categories.name,
    totalWeight: sql<string>`SUM(${harvestRecords.totalWeight})`,
    totalBoxes: sql<number>`SUM(${harvestRecords.boxCount})`,
  }).from(harvestRecords)
    .innerJoin(categories, eq(harvestRecords.categoryId, categories.id))
    .where(and(
      sql`${harvestRecords.workDate} >= ${startDate}`,
      sql`${harvestRecords.workDate} <= ${endDate}`,
      eq(harvestRecords.status, "approved")
    ))
    .groupBy(harvestRecords.categoryId, categories.name);

  const dailyTrend = await db.select({
    date: sql<string>`${harvestRecords.workDate}`.as('date'),
    totalWeight: sql<string>`SUM(${harvestRecords.totalWeight})`,
    totalBoxes: sql<number>`SUM(${harvestRecords.boxCount})`,
  }).from(harvestRecords)
    .where(and(
      sql`${harvestRecords.workDate} >= ${startDate}`,
      sql`${harvestRecords.workDate} <= ${endDate}`,
      eq(harvestRecords.status, "approved")
    ))
    .groupBy(harvestRecords.workDate)
    .orderBy(asc(harvestRecords.workDate));

  const pendingCount = await db.select({
    count: sql<number>`COUNT(*)`,
  }).from(harvestRecords)
    .where(eq(harvestRecords.status, "draft"));

  return {
    totals: totals[0],
    topEmployees,
    topRooms,
    byPackaging,
    byCategory,
    dailyTrend,
    pendingApproval: pendingCount[0]?.count ?? 0,
  };
}

// ============ AUDIT LOG ============
export async function createAuditEntry(data: Omit<InsertAuditLog, 'id' | 'createdAt'>) {
  const db = await getDb();
  if (!db) return;
  await db.insert(auditLog).values(data);
}

// ============ EXPORT DATA ============
export async function getHarvestRecordsForExport(filters: {
  startDate?: string;
  endDate?: string;
  employeeId?: number;
  roomId?: number;
  shiftId?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions: SQL[] = [eq(harvestRecords.status, "approved")];
  if (filters.startDate) conditions.push(sql`${harvestRecords.workDate} >= ${filters.startDate}`);
  if (filters.endDate) conditions.push(sql`${harvestRecords.workDate} <= ${filters.endDate}`);
  if (filters.employeeId) conditions.push(eq(harvestRecords.employeeId, filters.employeeId));
  if (filters.roomId) conditions.push(eq(harvestRecords.roomId, filters.roomId));
  if (filters.shiftId) conditions.push(eq(harvestRecords.shiftId, filters.shiftId));

  return db.select({
    workDate: harvestRecords.workDate,
    workTime: harvestRecords.workTime,
    employeeName: employees.name,
    roomName: rooms.name,
    shiftName: shifts.name,
    packagingName: packagingTypes.name,
    categoryName: categories.name,
    sizeName: sql<string>`COALESCE(${sizes.name}, '')`.as('sizeName'),
    boxCount: harvestRecords.boxCount,
    totalWeight: harvestRecords.totalWeight,
    avgWeightPerBox: harvestRecords.avgWeightPerBox,
    notes: harvestRecords.notes,
    status: harvestRecords.status,
  }).from(harvestRecords)
    .innerJoin(employees, eq(harvestRecords.employeeId, employees.id))
    .innerJoin(rooms, eq(harvestRecords.roomId, rooms.id))
    .innerJoin(shifts, eq(harvestRecords.shiftId, shifts.id))
    .innerJoin(packagingTypes, eq(harvestRecords.packagingTypeId, packagingTypes.id))
    .innerJoin(categories, eq(harvestRecords.categoryId, categories.id))
    .leftJoin(sizes, eq(harvestRecords.sizeId, sizes.id))
    .where(and(...conditions))
    .orderBy(desc(harvestRecords.workDate), desc(harvestRecords.createdAt));
}

// ============ GROW CYCLES ============

export async function listGrowCycles(roomId?: number, status?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions: SQL[] = [];
  if (roomId) conditions.push(eq(growCycles.roomId, roomId));
  if (status && (status === 'active' || status === 'harvesting' || status === 'completed')) {
    conditions.push(eq(growCycles.status, status as any));
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  return db.select().from(growCycles).where(whereClause).orderBy(desc(growCycles.startDate));
}

export async function getGrowCycle(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(growCycles).where(eq(growCycles.id, id)).limit(1);
  return result[0];
}

export async function getActiveGrowCycleForRoom(roomId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(growCycles)
    .where(and(
      eq(growCycles.roomId, roomId),
      sql`${growCycles.status} IN ('active', 'harvesting')`
    ))
    .orderBy(desc(growCycles.startDate))
    .limit(1);
  return result[0];
}

export async function createGrowCycle(data: Record<string, any>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(growCycles).values(data as any);
  return { id: result[0].insertId };
}

export async function updateGrowCycle(id: number, data: Record<string, any>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(growCycles).set(data as any).where(eq(growCycles.id, id));
}

export async function getNextCycleNumber(roomId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 1;
  const result = await db.select({
    maxCycle: sql<number>`COALESCE(MAX(${growCycles.cycleNumber}), 0)`,
  }).from(growCycles).where(eq(growCycles.roomId, roomId));
  return (result[0]?.maxCycle ?? 0) + 1;
}

// ============ CUSTOMERS ============

export async function listCustomers(status?: string) {
  const db = await getDb();
  if (!db) return [];
  if (status && (status === 'active' || status === 'inactive')) {
    return db.select().from(customers).where(eq(customers.status, status as any)).orderBy(asc(customers.name));
  }
  return db.select().from(customers).orderBy(asc(customers.name));
}

export async function getCustomer(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
  return result[0];
}

export async function createCustomer(data: Record<string, any>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(customers).values(data as any);
  return { id: result[0].insertId };
}

export async function updateCustomer(id: number, data: Record<string, any>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(customers).set(data as any).where(eq(customers.id, id));
}

// ============ DELIVERIES ============

export async function listDeliveries(filters: {
  startDate?: string;
  endDate?: string;
  customerId?: number;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return { deliveries: [], total: 0 };

  const conditions: SQL[] = [];
  if (filters.startDate) conditions.push(sql`${deliveries.deliveryDate} >= ${filters.startDate}`);
  if (filters.endDate) conditions.push(sql`${deliveries.deliveryDate} <= ${filters.endDate}`);
  if (filters.customerId) conditions.push(eq(deliveries.customerId, filters.customerId));
  if (filters.status && (filters.status === 'draft' || filters.status === 'dispatched')) {
    conditions.push(eq(deliveries.status, filters.status as any));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db.select({
    id: deliveries.id,
    customerId: deliveries.customerId,
    customerName: sql<string>`COALESCE(${customers.name}, '')`.as('customerName'),
    customerRivuchitAccountNumber: sql<string>`COALESCE(${customers.rivuchitAccountNumber}, '')`.as('customerRivuchitAccountNumber'),
    deliveryDate: deliveries.deliveryDate,
    status: deliveries.status,
    totalWeight: deliveries.totalWeight,
    totalCartons: deliveries.totalCartons,
    notes: deliveries.notes,
    createdByUserId: deliveries.createdByUserId,
    createdAt: deliveries.createdAt,
    updatedAt: deliveries.updatedAt,
  }).from(deliveries)
    .leftJoin(customers, eq(deliveries.customerId, customers.id))
    .where(whereClause)
    .orderBy(desc(deliveries.deliveryDate), desc(deliveries.createdAt))
    .limit(filters.limit ?? 100)
    .offset(filters.offset ?? 0);

  const countResult = await db.select({ count: sql<number>`count(*)` }).from(deliveries).where(whereClause);
  const total = countResult[0]?.count ?? 0;

  return { deliveries: rows, total };
}

export async function getDelivery(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const rows = await db.select({
    id: deliveries.id,
    customerId: deliveries.customerId,
    customerName: sql<string>`COALESCE(${customers.name}, '')`.as('customerName'),
    deliveryDate: deliveries.deliveryDate,
    status: deliveries.status,
    totalWeight: deliveries.totalWeight,
    totalCartons: deliveries.totalCartons,
    notes: deliveries.notes,
    createdByUserId: deliveries.createdByUserId,
    createdAt: deliveries.createdAt,
    updatedAt: deliveries.updatedAt,
  }).from(deliveries)
    .leftJoin(customers, eq(deliveries.customerId, customers.id))
    .where(eq(deliveries.id, id))
    .limit(1);

  const delivery = rows[0];
  if (!delivery) return undefined;

  const items = await getDeliveryItems(id);
  return { ...delivery, items };
}

export async function createDelivery(data: Record<string, any>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(deliveries).values(data as any);
  return { id: result[0].insertId };
}

export async function updateDelivery(id: number, data: Record<string, any>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(deliveries).set(data as any).where(eq(deliveries.id, id));
}

export async function addDeliveryItem(deliveryId: number, packedInventoryId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(deliveryItems).values({ deliveryId, packedInventoryId } as any);
  return { id: result[0].insertId };
}

export async function removeDeliveryItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(deliveryItems).where(eq(deliveryItems.id, id));
}

export async function getDeliveryItems(deliveryId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: deliveryItems.id,
    deliveryId: deliveryItems.deliveryId,
    packedInventoryId: deliveryItems.packedInventoryId,
    barcode: packedInventory.barcode,
    productType: packedInventory.productType,
    packedWeight: packedInventory.packedWeight,
    unitCount: packedInventory.unitCount,
    basketCount: packedInventory.basketCount,
    packingDate: packedInventory.packingDate,
    status: packedInventory.status,
  }).from(deliveryItems)
    .innerJoin(packedInventory, eq(deliveryItems.packedInventoryId, packedInventory.id))
    .where(eq(deliveryItems.deliveryId, deliveryId));
}

export async function dispatchDelivery(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  // Get all items in this delivery
  const items = await getDeliveryItems(id);

  // Mark all packed items as shipped
  for (const item of items) {
    await db.update(packedInventory)
      .set({ status: "shipped" })
      .where(eq(packedInventory.id, item.packedInventoryId));
  }

  // Mark delivery as dispatched
  await db.update(deliveries)
    .set({ status: "dispatched" })
    .where(eq(deliveries.id, id));
}

// ============ PRODUCT CATALOG ============

export async function listProductCatalog(statusFilter?: string) {
  const db = await getDb();
  if (!db) return [];
  if (statusFilter && (statusFilter === 'active' || statusFilter === 'inactive')) {
    return db.select().from(productCatalog)
      .where(eq(productCatalog.status, statusFilter))
      .orderBy(asc(productCatalog.rivuchitProductId));
  }
  return db.select().from(productCatalog).orderBy(asc(productCatalog.rivuchitProductId));
}

export async function getProductCatalogItem(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(productCatalog).where(eq(productCatalog.id, id)).limit(1);
  return result[0];
}

export async function createProductCatalogItem(data: Record<string, any>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(productCatalog).values(data as any);
  return { id: result[0].insertId };
}

export async function updateProductCatalogItem(id: number, data: Record<string, any>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(productCatalog).set(data as any).where(eq(productCatalog.id, id));
}

// ============ MONTHLY RIVUCHIT EXPORT ============

export interface RivuchitExportRow {
  deliveryId: number;
  deliveryDate: string; // YYYY-MM-DD
  documentNumber: string; // "D-{deliveryId}"
  customerAccountNumber: string;
  customerName: string;
  customerFirstName: string;
  customerAddress: string;
  customerCity: string;
  rivuchitProductId: number;
  productNameHebrew: string;
  quantity: number;
  pricePerUnit: string;
  totalAmount: string;
}

export async function getMonthlyExportData(year: number, month: number): Promise<RivuchitExportRow[]> {
  const db = await getDb();
  if (!db) return [];

  // Pad month for SQL comparison
  const monthStr = String(month).padStart(2, '0');
  const startDate = `${year}-${monthStr}-01`;
  // Last day of month
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`;

  const rows = await db.select({
    deliveryId: deliveries.id,
    deliveryDate: deliveries.deliveryDate,
    customerId: deliveries.customerId,
    customerName: sql<string>`COALESCE(${customers.name}, '')`.as('customerName'),
    customerAccountNumber: sql<string>`COALESCE(${customers.rivuchitAccountNumber}, '')`.as('customerAccountNumber'),
    customerAddress: sql<string>`COALESCE(${customers.address}, '')`.as('customerAddress'),
    rivuchitProductId: productCatalog.rivuchitProductId,
    productNameHebrew: productCatalog.nameHebrew,
    quantity: packedInventory.unitCount,
    pricePerUnit: productCatalog.pricePerUnit,
  }).from(deliveries)
    .innerJoin(customers, eq(deliveries.customerId, customers.id))
    .innerJoin(deliveryItems, eq(deliveryItems.deliveryId, deliveries.id))
    .innerJoin(packedInventory, eq(deliveryItems.packedInventoryId, packedInventory.id))
    .innerJoin(productCatalog, eq(packedInventory.productCatalogId, productCatalog.id))
    .where(and(
      eq(deliveries.status, 'dispatched'),
      sql`${deliveries.deliveryDate} >= ${startDate}`,
      sql`${deliveries.deliveryDate} <= ${endDate}`,
    ))
    .orderBy(asc(deliveries.deliveryDate), asc(deliveries.id));

  return rows.map(row => {
    const qty = row.quantity ?? 0;
    const price = parseFloat(String(row.pricePerUnit ?? '0'));
    const total = (qty * price).toFixed(2);

    // Split address into street+city heuristic: last comma-separated part is city
    const addressParts = (row.customerAddress ?? '').split(',').map((p: string) => p.trim());
    const customerCity = addressParts.length > 1 ? addressParts[addressParts.length - 1] : '';
    const customerAddress = addressParts.length > 1 ? addressParts.slice(0, -1).join(', ') : (row.customerAddress ?? '');

    return {
      deliveryId: row.deliveryId,
      deliveryDate: row.deliveryDate ? String(row.deliveryDate).split('T')[0] : '',
      documentNumber: `D-${row.deliveryId}`,
      customerAccountNumber: row.customerAccountNumber ?? '',
      customerName: row.customerName ?? '',
      customerFirstName: '',
      customerAddress,
      customerCity,
      rivuchitProductId: row.rivuchitProductId,
      productNameHebrew: row.productNameHebrew,
      quantity: qty,
      pricePerUnit: price.toFixed(2),
      totalAmount: total,
    };
  });
}
