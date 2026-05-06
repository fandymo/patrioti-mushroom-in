import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the db module
vi.mock("./db", () => ({
  listEmployees: vi.fn().mockResolvedValue([
    { id: 1, name: "יוסי כהן", employeeNumber: "E001", phone: "050-1234567", status: "active", role: "worker" },
    { id: 2, name: "דוד לוי", employeeNumber: "E002", phone: "050-7654321", status: "active", role: "worker" },
  ]),
  getEmployee: vi.fn().mockResolvedValue({ id: 1, name: "יוסי כהן", status: "active", role: "worker" }),
  createEmployee: vi.fn().mockResolvedValue({ id: 3 }),
  updateEmployee: vi.fn().mockResolvedValue(undefined),
  listRooms: vi.fn().mockResolvedValue([
    { id: 1, name: "חדר 1", status: "active" },
    { id: 2, name: "חדר 2", status: "active" },
  ]),
  getRoom: vi.fn().mockResolvedValue({ id: 1, name: "חדר 1", status: "active" }),
  createRoom: vi.fn().mockResolvedValue({ id: 3 }),
  updateRoom: vi.fn().mockResolvedValue(undefined),
  listPackagingTypes: vi.fn().mockResolvedValue([{ id: 1, name: "ארגז 5 ק\"ג", status: "active" }]),
  createPackagingType: vi.fn().mockResolvedValue({ id: 2 }),
  updatePackagingType: vi.fn().mockResolvedValue(undefined),
  listCategories: vi.fn().mockResolvedValue([{ id: 1, name: "A", status: "active" }]),
  createCategory: vi.fn().mockResolvedValue({ id: 2 }),
  updateCategory: vi.fn().mockResolvedValue(undefined),
  listShifts: vi.fn().mockResolvedValue([{ id: 1, name: "בוקר", status: "active" }]),
  createShift: vi.fn().mockResolvedValue({ id: 2 }),
  updateShift: vi.fn().mockResolvedValue(undefined),
  listHarvestRecords: vi.fn().mockResolvedValue({ records: [], total: 0 }),
  getHarvestRecord: vi.fn().mockResolvedValue({ id: 1, boxCount: 10, totalWeight: "50.5", status: "draft" }),
  createHarvestRecord: vi.fn().mockResolvedValue({ id: 1 }),
  updateHarvestRecord: vi.fn().mockResolvedValue(undefined),
  approveHarvestRecord: vi.fn().mockResolvedValue(undefined),
  cancelHarvestRecord: vi.fn().mockResolvedValue(undefined),
  createAuditEntry: vi.fn().mockResolvedValue(undefined),
  getDailySummary: vi.fn().mockResolvedValue({ totalWeight: "150.5", totalBoxes: 30, recordCount: 5, employeeCount: 3 }),
  getReportByEmployee: vi.fn().mockResolvedValue([]),
  getReportByRoom: vi.fn().mockResolvedValue([]),
  getReportByShift: vi.fn().mockResolvedValue([]),
  getDashboardData: vi.fn().mockResolvedValue({ totals: { totalWeight: "500", totalBoxes: 100, recordCount: 20 }, pendingApproval: 3, topEmployees: [], topRooms: [], byPackaging: [], byCategory: [], dailyTrend: [] }),
  getHarvestRecordsForExport: vi.fn().mockResolvedValue([]),
  listSizes: vi.fn().mockResolvedValue([{ id: 1, name: "Small", status: "active" }, { id: 2, name: "Basket", status: "active" }, { id: 3, name: "Filling", status: "active" }]),
  createSize: vi.fn().mockResolvedValue({ id: 4 }),
  updateSize: vi.fn().mockResolvedValue(undefined),
  listUsers: vi.fn().mockResolvedValue([
    { id: 1, openId: "admin-user", name: "Admin User", email: "admin@example.com", role: "admin" },
    { id: 2, openId: "worker-user", name: "Worker User", email: "worker@example.com", role: "user" },
  ]),
  updateUserRole: vi.fn().mockResolvedValue(undefined),
  linkEmployeeToUser: vi.fn().mockResolvedValue(undefined),
  getEmployeeByUserId: vi.fn().mockImplementation(async (userId: number) => {
    if (userId === 2) return { id: 1, name: "Worker Employee", userId: 2 };
    return null;
  }),
}));

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-user",
      email: "admin@example.com",
      name: "Admin User",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createWorkerContext(): TrpcContext {
  return {
    user: {
      id: 2,
      openId: "worker-user",
      email: "worker@example.com",
      name: "Worker User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("employees router", () => {
  it("lists employees for authenticated user", async () => {
    const caller = appRouter.createCaller(createWorkerContext());
    const result = await caller.employees.list({ status: "active" });
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("יוסי כהן");
  });

  it("rejects unauthenticated user from listing employees", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    await expect(caller.employees.list()).rejects.toThrow();
  });

  it("allows admin to create employee", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.employees.create({ name: "עובד חדש", role: "worker" });
    expect(result).toEqual({ id: 3 });
  });

  it("rejects non-admin from creating employee", async () => {
    const caller = appRouter.createCaller(createWorkerContext());
    await expect(caller.employees.create({ name: "test" })).rejects.toThrow();
  });

  it("allows admin to update employee", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.employees.update({ id: 1, name: "שם חדש" });
    expect(result).toEqual({ success: true });
  });
});

describe("rooms router", () => {
  it("lists rooms for authenticated user", async () => {
    const caller = appRouter.createCaller(createWorkerContext());
    const result = await caller.rooms.list({ status: "active" });
    expect(result).toHaveLength(2);
  });

  it("allows admin to create room", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.rooms.create({ name: "חדר חדש" });
    expect(result).toEqual({ id: 3 });
  });

  it("rejects non-admin from creating room", async () => {
    const caller = appRouter.createCaller(createWorkerContext());
    await expect(caller.rooms.create({ name: "test" })).rejects.toThrow();
  });
});

describe("harvest router", () => {
  it("lists harvest records for authenticated user", async () => {
    const caller = appRouter.createCaller(createWorkerContext());
    const result = await caller.harvest.list({ startDate: "2026-01-01", endDate: "2026-12-31" });
    expect(result).toEqual({ records: [], total: 0 });
  });

  it("allows worker to create harvest record for themselves", async () => {
    const caller = appRouter.createCaller(createWorkerContext());
    const result = await caller.harvest.create({
      workDate: "2026-03-22",
      employeeId: 1, // matches getEmployeeByUserId(2) => { id: 1 }
      roomId: 1,
      shiftId: 1,
      packagingTypeId: 1,
      categoryId: 1,
      boxCount: 10,
      totalWeight: "50.5",
    });
    expect(result).toEqual({ id: 1 });
  });

  it("rejects worker from creating harvest record for another employee", async () => {
    const caller = appRouter.createCaller(createWorkerContext());
    await expect(caller.harvest.create({
      workDate: "2026-03-22",
      employeeId: 99, // not the worker's linked employee
      roomId: 1,
      shiftId: 1,
      packagingTypeId: 1,
      categoryId: 1,
      boxCount: 10,
      totalWeight: "50.5",
    })).rejects.toThrow("You can only create harvest records for yourself");
  });

  it("allows admin to create harvest record for any employee", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.harvest.create({
      workDate: "2026-03-22",
      employeeId: 99,
      roomId: 1,
      shiftId: 1,
      packagingTypeId: 1,
      categoryId: 1,
      boxCount: 10,
      totalWeight: "50.5",
    });
    expect(result).toEqual({ id: 1 });
  });

  it("rejects unauthenticated user from creating harvest record", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    await expect(caller.harvest.create({
      workDate: "2026-03-22",
      employeeId: 1,
      roomId: 1,
      shiftId: 1,
      packagingTypeId: 1,
      categoryId: 1,
      boxCount: 10,
      totalWeight: "50.5",
    })).rejects.toThrow();
  });

  it("rejects unlinked worker from creating harvest record", async () => {
    // Create a worker context with id=99 (not linked to any employee)
    const unlinkedWorkerCtx: TrpcContext = {
      user: {
        id: 99,
        openId: "unlinked-worker",
        email: "unlinked@example.com",
        name: "Unlinked Worker",
        loginMethod: "manus",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(unlinkedWorkerCtx);
    await expect(caller.harvest.create({
      workDate: "2026-03-22",
      employeeId: 1,
      roomId: 1,
      shiftId: 1,
      packagingTypeId: 1,
      categoryId: 1,
      boxCount: 10,
      totalWeight: "50.5",
    })).rejects.toThrow("not linked to an employee");
  });

  it("allows admin to approve harvest record", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.harvest.approve({ id: 1 });
    expect(result).toEqual({ success: true });
  });

  it("rejects non-admin from approving harvest record", async () => {
    const caller = appRouter.createCaller(createWorkerContext());
    await expect(caller.harvest.approve({ id: 1 })).rejects.toThrow();
  });

  it("allows admin to cancel harvest record", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.harvest.cancel({ id: 1 });
    expect(result).toEqual({ success: true });
  });
});

describe("reports router", () => {
  it("returns daily summary for authenticated user", async () => {
    const caller = appRouter.createCaller(createWorkerContext());
    const result = await caller.reports.dailySummary({ date: "2026-03-22" });
    expect(result).toHaveProperty("totalWeight");
    expect(result).toHaveProperty("totalBoxes");
    expect(result).toHaveProperty("recordCount");
  });

  it("returns dashboard data for authenticated user", async () => {
    const caller = appRouter.createCaller(createWorkerContext());
    const result = await caller.reports.dashboard({ startDate: "2026-01-01", endDate: "2026-12-31" });
    expect(result).toHaveProperty("totals");
    expect(result).toHaveProperty("pendingApproval");
    expect(result).toHaveProperty("topEmployees");
    expect(result).toHaveProperty("topRooms");
  });

  it("rejects unauthenticated user from accessing reports", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    await expect(caller.reports.dailySummary({ date: "2026-03-22" })).rejects.toThrow();
  });
});

describe("master data routers", () => {
  it("lists packaging types", async () => {
    const caller = appRouter.createCaller(createWorkerContext());
    const result = await caller.packagingTypes.list();
    expect(result).toHaveLength(1);
  });

  it("lists categories", async () => {
    const caller = appRouter.createCaller(createWorkerContext());
    const result = await caller.categories.list();
    expect(result).toHaveLength(1);
  });

  it("lists shifts", async () => {
    const caller = appRouter.createCaller(createWorkerContext());
    const result = await caller.shifts.list();
    expect(result).toHaveLength(1);
  });

  it("allows admin to create packaging type", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.packagingTypes.create({ name: "ארגז 10 ק\"ג" });
    expect(result).toEqual({ id: 2 });
  });

  it("rejects non-admin from creating packaging type", async () => {
    const caller = appRouter.createCaller(createWorkerContext());
    await expect(caller.packagingTypes.create({ name: "test" })).rejects.toThrow();
  });
});

describe("sizes router", () => {
  it("lists sizes for authenticated user", async () => {
    const caller = appRouter.createCaller(createWorkerContext());
    const result = await caller.sizes.list();
    expect(result).toHaveLength(3);
    expect(result[0].name).toBe("Small");
    expect(result[1].name).toBe("Basket");
    expect(result[2].name).toBe("Filling");
  });

  it("allows admin to create size", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.sizes.create({ name: "Large" });
    expect(result).toEqual({ id: 4 });
  });

  it("allows admin to update size", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.sizes.update({ id: 1, name: "Extra Small" });
    expect(result).toBeUndefined();
  });

  it("rejects non-admin from creating size", async () => {
    const caller = appRouter.createCaller(createWorkerContext());
    await expect(caller.sizes.create({ name: "test" })).rejects.toThrow();
  });

  it("allows harvest record with sizeId", async () => {
    const caller = appRouter.createCaller(createWorkerContext());
    const result = await caller.harvest.create({
      workDate: "2026-03-22",
      employeeId: 1,
      roomId: 1,
      shiftId: 1,
      packagingTypeId: 1,
      categoryId: 1,
      sizeId: 2,
      boxCount: 5,
      totalWeight: "25.0",
    });
    expect(result).toEqual({ id: 1 });
  });
});

describe("users router", () => {
  it("allows admin to list users", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.users.list();
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Admin User");
  });

  it("rejects non-admin from listing users", async () => {
    const caller = appRouter.createCaller(createWorkerContext());
    await expect(caller.users.list()).rejects.toThrow();
  });

  it("allows admin to update user role", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.users.updateRole({ id: 2, role: "admin" });
    expect(result).toEqual({ success: true });
  });

  it("allows admin to link employee to user", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.users.linkEmployee({ employeeId: 1, userId: 2 });
    expect(result).toEqual({ success: true });
  });

  it("allows admin to unlink employee from user", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.users.linkEmployee({ employeeId: 1, userId: null });
    expect(result).toEqual({ success: true });
  });

  it("rejects non-admin from updating user role", async () => {
    const caller = appRouter.createCaller(createWorkerContext());
    await expect(caller.users.updateRole({ id: 1, role: "admin" })).rejects.toThrow();
  });
});

describe("auth.myEmployee", () => {
  it("returns linked employee for authenticated worker", async () => {
    const caller = appRouter.createCaller(createWorkerContext());
    const result = await caller.auth.myEmployee();
    expect(result).toEqual({ id: 1, name: "Worker Employee", userId: 2 });
  });

  it("returns null for admin without linked employee", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.auth.myEmployee();
    expect(result).toBeNull();
  });
});

// Mock the inventory-db module
vi.mock("./inventory-db", () => ({
  formatDateCode: vi.fn().mockReturnValue("260325"),
  getNextBarcode: vi.fn().mockResolvedValue("H-260325-01-01-0001"),
  createHarvestedItem: vi.fn().mockResolvedValue({ id: 1, barcode: "H-260325-01-01-0001" }),
  listHarvestedInventory: vi.fn().mockResolvedValue({ items: [
    { id: 1, barcode: "H-260325-01-01-0001", status: "available", originalWeight: "50.0", currentWeight: "50.0" }
  ], total: 1 }),
  getHarvestedItem: vi.fn().mockResolvedValue({
    id: 1, barcode: "H-260325-01-01-0001", status: "available",
    originalWeight: "50.0", currentWeight: "50.0", roomId: 1, employeeId: 1
  }),
  getHarvestedItemByBarcode: vi.fn().mockResolvedValue({
    id: 1, barcode: "H-260325-01-01-0001", status: "available",
    originalWeight: "50.0", currentWeight: "50.0"
  }),
  updateHarvestedItem: vi.fn().mockResolvedValue(undefined),
  createPackedItem: vi.fn().mockResolvedValue({ id: 1, barcode: "P-260325-LN-0001" }),
  listPackedInventory: vi.fn().mockResolvedValue({ items: [
    { id: 1, barcode: "P-260325-LN-0001", status: "available", packedWeight: "10.0" }
  ], total: 1 }),
  getPackedItem: vi.fn().mockResolvedValue({
    id: 1, barcode: "P-260325-LN-0001", status: "available", packedWeight: "10.0", unitCount: 5
  }),
  getPackedItemByBarcode: vi.fn().mockResolvedValue({
    id: 1, barcode: "P-260325-LN-0001", status: "available", packedWeight: "10.0", unitCount: 5
  }),
  updatePackedItem: vi.fn().mockResolvedValue(undefined),
  createPackedSourceLink: vi.fn().mockResolvedValue(undefined),
  getSourceLinksForPacked: vi.fn().mockResolvedValue([]),
  getTraceabilityForPacked: vi.fn().mockResolvedValue([]),
  createMovement: vi.fn().mockResolvedValue({ id: 1 }),
  listMovements: vi.fn().mockResolvedValue({ movements: [
    { id: 1, movementType: "harvest_intake", inventoryType: "harvested", itemBarcode: "H-260325-01-01-0001" }
  ], total: 1 }),
  getInventorySummary: vi.fn().mockResolvedValue({
    harvestedAvailable: 5, harvestedWeight: "250.0",
    packedAvailable: 10, packedWeight: "100.0",
    shippedCount: 3, shippedWeight: "30.0"
  }),
}));

describe("inventory router", () => {
  it("allows admin to create harvested item", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.inventory.harvestedCreate({
      harvestDate: "2026-03-25",
      roomId: 1,
      harvestWave: 1,
      employeeId: 1,
      categoryId: 1,
      originalWeight: "50.0",
      boxCount: 10,
    });
    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("barcode");
  });

  it("lists harvested inventory", async () => {
    const caller = appRouter.createCaller(createWorkerContext());
    const result = await caller.inventory.harvestedList({});
    expect(result.items).toHaveLength(1);
    expect(result.items[0].barcode).toBe("H-260325-01-01-0001");
  });

  it("looks up barcode for harvested item", async () => {
    const caller = appRouter.createCaller(createWorkerContext());
    const result = await caller.inventory.lookupBarcode({ barcode: "H-260325-01-01-0001" });
    expect(result).toBeDefined();
  });

  it("looks up barcode for packed item", async () => {
    const caller = appRouter.createCaller(createWorkerContext());
    const result = await caller.inventory.lookupBarcode({ barcode: "P-260325-LN-0001" });
    expect(result).toBeDefined();
  });

  it("allows admin to create packed item", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.inventory.packedCreate({
      packingDate: "2026-03-25",
      harvestWave: 1,
      categoryId: 1,
      packagingTypeId: 1,
      packedWeight: "10.0",
      unitCount: 5,
      sourceItems: [{ harvestedInventoryId: 1, weightUsed: "10.0" }],
    });
    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("barcode");
  });

  it("lists packed inventory", async () => {
    const caller = appRouter.createCaller(createWorkerContext());
    const result = await caller.inventory.packedList({});
    expect(result.items).toHaveLength(1);
    expect(result.items[0].barcode).toBe("P-260325-LN-0001");
  });

  it("allows shipping a packed item", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.inventory.packedShip({ barcode: "P-260325-LN-0001" });
    expect(result).toHaveProperty("success");
  });

  it("returns inventory summary", async () => {
    const caller = appRouter.createCaller(createWorkerContext());
    const result = await caller.inventory.summary();
    expect(result).toHaveProperty("harvestedAvailable");
    expect(result).toHaveProperty("packedAvailable");
    expect(result).toHaveProperty("shippedCount");
  });

  it("lists inventory movements", async () => {
    const caller = appRouter.createCaller(createWorkerContext());
    const result = await caller.inventory.movements({});
    expect(result.movements).toHaveLength(1);
    expect(result.movements[0].movementType).toBe("harvest_intake");
  });

  it("rejects unauthenticated user from inventory operations", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    await expect(caller.inventory.harvestedList({})).rejects.toThrow();
    await expect(caller.inventory.summary()).rejects.toThrow();
  });
});
