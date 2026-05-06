import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import * as db from "./db";
import * as invDb from "./inventory-db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    myEmployee: protectedProcedure.query(async ({ ctx }) => {
      return db.getEmployeeByUserId(ctx.user.id);
    }),
  }),

  users: router({
    list: adminProcedure.query(() => db.listUsers()),
    updateRole: adminProcedure
      .input(z.object({ id: z.number(), role: z.enum(["user", "admin"]) }))
      .mutation(async ({ input }) => {
        await db.updateUserRole(input.id, input.role);
        return { success: true };
      }),
    linkEmployee: adminProcedure
      .input(z.object({ employeeId: z.number(), userId: z.number().nullable() }))
      .mutation(async ({ input }) => {
        await db.linkEmployeeToUser(input.employeeId, input.userId);
        return { success: true };
      }),
    createUser: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(4, "Password must be at least 4 characters"),
        role: z.enum(["user", "admin"]),
        employeeId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const existing = await db.getUserByEmail(input.email.toLowerCase().trim());
        if (existing) {
          throw new TRPCError({ code: 'CONFLICT', message: 'A user with this email already exists.' });
        }
        const passwordHash = await bcrypt.hash(input.password, 10);
        const result = await db.createUserWithPassword({
          name: input.name,
          email: input.email.toLowerCase().trim(),
          role: input.role,
          passwordHash,
        });
        if (input.employeeId) {
          await db.linkEmployeeToUser(input.employeeId, result.id);
        }
        return { success: true, userId: result.id };
      }),
    resetPassword: adminProcedure
      .input(z.object({
        userId: z.number(),
        newPassword: z.string().min(4, "Password must be at least 4 characters"),
      }))
      .mutation(async ({ input }) => {
        const user = await db.getUserById(input.userId);
        if (!user) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found.' });
        }
        const passwordHash = await bcrypt.hash(input.newPassword, 10);
        await db.updateUserPassword(input.userId, passwordHash);
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (input.id === ctx.user.id) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'You cannot delete your own account.' });
        }
        await db.deleteUser(input.id);
        return { success: true };
      }),
  }),

  employees: router({
    list: protectedProcedure
      .input(z.object({ status: z.string().optional() }).optional())
      .query(({ input }) => db.listEmployees(input?.status)),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getEmployee(input.id)),
    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        employeeNumber: z.string().optional(),
        phone: z.string().optional(),
        status: z.enum(["active", "inactive"]).optional(),
        role: z.enum(["worker", "supervisor", "manager"]).optional(),
        startDate: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await db.createEmployee(input);
        await db.createAuditEntry({
          userId: ctx.user.id,
          action: "create",
          tableName: "employees",
          recordId: result.id,
          newValues: JSON.stringify(input),
        });
        return result;
      }),
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        employeeNumber: z.string().optional(),
        phone: z.string().optional(),
        status: z.enum(["active", "inactive"]).optional(),
        role: z.enum(["worker", "supervisor", "manager"]).optional(),
        startDate: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        const old = await db.getEmployee(id);
        await db.updateEmployee(id, data);
        await db.createAuditEntry({
          userId: ctx.user.id,
          action: "update",
          tableName: "employees",
          recordId: id,
          oldValues: JSON.stringify(old),
          newValues: JSON.stringify(data),
        });
        return { success: true };
      }),
  }),

  rooms: router({
    list: protectedProcedure
      .input(z.object({ status: z.string().optional() }).optional())
      .query(({ input }) => db.listRooms(input?.status)),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getRoom(input.id)),
    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        status: z.enum(["active", "inactive"]).optional(),
        roomType: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await db.createRoom(input);
        await db.createAuditEntry({
          userId: ctx.user.id,
          action: "create",
          tableName: "rooms",
          recordId: result.id,
          newValues: JSON.stringify(input),
        });
        return result;
      }),
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        status: z.enum(["active", "inactive"]).optional(),
        roomType: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        await db.updateRoom(id, data);
        await db.createAuditEntry({
          userId: ctx.user.id,
          action: "update",
          tableName: "rooms",
          recordId: id,
          newValues: JSON.stringify(data),
        });
        return { success: true };
      }),
  }),

  packagingTypes: router({
    list: protectedProcedure
      .input(z.object({ status: z.string().optional() }).optional())
      .query(({ input }) => db.listPackagingTypes(input?.status)),
    create: adminProcedure
      .input(z.object({ name: z.string().min(1), status: z.enum(["active", "inactive"]).optional() }))
      .mutation(({ input }) => db.createPackagingType(input)),
    update: adminProcedure
      .input(z.object({ id: z.number(), name: z.string().optional(), status: z.enum(["active", "inactive"]).optional() }))
      .mutation(({ input }) => { const { id, ...data } = input; return db.updatePackagingType(id, data); }),
  }),

  categories: router({
    list: protectedProcedure
      .input(z.object({ status: z.string().optional() }).optional())
      .query(({ input }) => db.listCategories(input?.status)),
    create: adminProcedure
      .input(z.object({ name: z.string().min(1), status: z.enum(["active", "inactive"]).optional() }))
      .mutation(({ input }) => db.createCategory(input)),
    update: adminProcedure
      .input(z.object({ id: z.number(), name: z.string().optional(), status: z.enum(["active", "inactive"]).optional() }))
      .mutation(({ input }) => { const { id, ...data } = input; return db.updateCategory(id, data); }),
  }),

  shifts: router({
    list: protectedProcedure
      .input(z.object({ status: z.string().optional() }).optional())
      .query(({ input }) => db.listShifts(input?.status)),
    create: adminProcedure
      .input(z.object({ name: z.string().min(1), startTime: z.string().optional(), endTime: z.string().optional(), status: z.enum(["active", "inactive"]).optional() }))
      .mutation(({ input }) => db.createShift(input)),
    update: adminProcedure
      .input(z.object({ id: z.number(), name: z.string().optional(), startTime: z.string().optional(), endTime: z.string().optional(), status: z.enum(["active", "inactive"]).optional() }))
      .mutation(({ input }) => { const { id, ...data } = input; return db.updateShift(id, data); }),
  }),

  sizes: router({
    list: protectedProcedure
      .input(z.object({ status: z.string().optional() }).optional())
      .query(({ input }) => db.listSizes(input?.status)),
    create: adminProcedure
      .input(z.object({ name: z.string().min(1), status: z.enum(["active", "inactive"]).optional() }))
      .mutation(({ input }) => db.createSize(input)),
    update: adminProcedure
      .input(z.object({ id: z.number(), name: z.string().optional(), status: z.enum(["active", "inactive"]).optional() }))
      .mutation(({ input }) => { const { id, ...data } = input; return db.updateSize(id, data); }),
  }),

  harvest: router({
    list: protectedProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        employeeId: z.number().optional(),
        roomId: z.number().optional(),
        shiftId: z.number().optional(),
        packagingTypeId: z.number().optional(),
        categoryId: z.number().optional(),
        sizeId: z.number().optional(),
        status: z.string().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      }).optional())
      .query(({ input }) => db.listHarvestRecords(input ?? {})),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getHarvestRecord(input.id)),
    create: protectedProcedure
      .input(z.object({
        workDate: z.string(),
        workTime: z.string().optional(),
        employeeId: z.number(),
        roomId: z.number(),
        shiftId: z.number(),
        packagingTypeId: z.number(),
        categoryId: z.number(),
        sizeId: z.number().optional(),
        harvestWave: z.number().min(1).max(5).optional(),
        boxCount: z.number().int().positive(),
        totalWeight: z.string(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Workers can only create records for themselves
        if (ctx.user.role !== 'admin') {
          const myEmployee = await db.getEmployeeByUserId(ctx.user.id);
          if (!myEmployee) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'Your user account is not linked to an employee. Contact an admin.' });
          }
          if (input.employeeId !== myEmployee.id) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'You can only create harvest records for yourself.' });
          }
        }
        const result = await db.createHarvestRecord({
          ...input,
          createdByUserId: ctx.user.id,
        });
        await db.createAuditEntry({
          userId: ctx.user.id,
          action: "create",
          tableName: "harvest_records",
          recordId: result.id,
          newValues: JSON.stringify(input),
        });
        return result;
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        workDate: z.string().optional(),
        workTime: z.string().optional(),
        employeeId: z.number().optional(),
        roomId: z.number().optional(),
        shiftId: z.number().optional(),
        packagingTypeId: z.number().optional(),
        categoryId: z.number().optional(),
        sizeId: z.number().optional(),
        harvestWave: z.number().min(1).max(5).optional(),
        boxCount: z.number().int().positive().optional(),
        totalWeight: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        const old = await db.getHarvestRecord(id);
        await db.updateHarvestRecord(id, data);
        await db.createAuditEntry({
          userId: ctx.user.id,
          action: "update",
          tableName: "harvest_records",
          recordId: id,
          oldValues: JSON.stringify(old),
          newValues: JSON.stringify(data),
        });
        return { success: true };
      }),
    approve: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await db.approveHarvestRecord(input.id, ctx.user.id);
        await db.createAuditEntry({
          userId: ctx.user.id,
          action: "approve",
          tableName: "harvest_records",
          recordId: input.id,
        });
        return { success: true };
      }),
    cancel: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await db.cancelHarvestRecord(input.id);
        await db.createAuditEntry({
          userId: ctx.user.id,
          action: "cancel",
          tableName: "harvest_records",
          recordId: input.id,
        });
        return { success: true };
      }),

    // ============ WEIGHING STATION ============
    weighingCreate: protectedProcedure
      .input(z.object({
        workDate: z.string(),
        workTime: z.string().optional(),
        employeeId: z.number(),
        roomId: z.number(),
        shiftId: z.number(),
        packagingTypeId: z.number(),
        categoryId: z.number(),
        sizeId: z.number().optional(),
        harvestWave: z.number().min(1).max(3),
        growCycleId: z.number().optional(),
        boxCount: z.number().int().positive(),
        basketCount: z.number().int().optional(),
        totalWeight: z.string(),
        storageLocation: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return invDb.createWeighingEntry(input, ctx.user.id);
      }),
  }),

  // ============ INVENTORY MODULE ============

  inventory: router({
    // Barcode lookup
    lookupBarcode: protectedProcedure
      .input(z.object({ barcode: z.string() }))
      .query(async ({ input }) => {
        const harvested = await invDb.getHarvestedItemByBarcode(input.barcode);
        if (harvested) return { type: "harvested" as const, item: harvested };
        const packed = await invDb.getPackedItemByBarcode(input.barcode);
        if (packed) return { type: "packed" as const, item: packed };
        return null;
      }),

    summary: protectedProcedure.query(() => invDb.getInventorySummary()),

    // Harvested inventory
    harvestedList: protectedProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        roomId: z.number().optional(),
        employeeId: z.number().optional(),
        harvestWave: z.number().optional(),
        batchNumber: z.string().optional(),
        status: z.string().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      }).optional())
      .query(({ input }) => invDb.listHarvestedInventory(input ?? {})),

    harvestedGet: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => invDb.getHarvestedItem(input.id)),

    harvestedCreate: protectedProcedure
      .input(z.object({
        harvestDate: z.string(),
        harvestTime: z.string().optional(),
        roomId: z.number(),
        harvestWave: z.number().min(1).max(5),
        employeeId: z.number(),
        categoryId: z.number(),
        sizeId: z.number().optional(),
        originalWeight: z.string(),
        boxCount: z.number().int().positive(),
        storageLocation: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Generate barcode: H-YYMMDD-RR-BB-SSSS
        const dateCode = invDb.formatDateCode(input.harvestDate);
        const roomCode = String(input.roomId).padStart(2, "0");
        const batchCode = String(input.harvestWave).padStart(2, "0");
        const barcode = await invDb.getNextBarcode("H", dateCode, `${roomCode}-${batchCode}`);
        const batchNumber = `H-${dateCode}-${roomCode}`;

        const weight = input.originalWeight;
        const result = await invDb.createHarvestedItem({
          barcode,
          batchNumber,
          harvestDate: input.harvestDate,
          harvestTime: input.harvestTime,
          roomId: input.roomId,
          harvestWave: input.harvestWave,
          employeeId: input.employeeId,
          categoryId: input.categoryId,
          sizeId: input.sizeId,
          originalWeight: weight,
          consumedWeight: "0",
          remainingWeight: weight,
          boxCount: input.boxCount,
          storageLocation: input.storageLocation,
          notes: input.notes,
          createdByUserId: ctx.user.id,
        });

        // Record movement
        await invDb.createMovement({
          movementDate: input.harvestDate,
          movementTime: input.harvestTime,
          movementType: "harvest_intake",
          inventoryType: "harvested",
          itemId: result.id,
          itemBarcode: barcode,
          weight,
          quantity: input.boxCount,
          userId: ctx.user.id,
        });

        return { id: result.id, barcode };
      }),

    // Consume harvested item (for packing)
    harvestedConsume: protectedProcedure
      .input(z.object({
        id: z.number(),
        consumeWeight: z.string(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const item = await invDb.getHarvestedItem(input.id);
        if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Harvested item not found" });
        if (item.status === "fully_consumed" || item.status === "cancelled" || item.status === "damaged") {
          throw new TRPCError({ code: "BAD_REQUEST", message: `Item status is '${item.status}' and cannot be consumed` });
        }

        const remaining = parseFloat(String(item.remainingWeight));
        const toConsume = parseFloat(input.consumeWeight);
        if (toConsume <= 0 || toConsume > remaining) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `Cannot consume ${toConsume}kg. Available: ${remaining}kg` });
        }

        const newConsumed = parseFloat(String(item.consumedWeight)) + toConsume;
        const newRemaining = remaining - toConsume;
        const newStatus = newRemaining <= 0.01 ? "fully_consumed" : "partially_consumed";

        await invDb.updateHarvestedItem(input.id, {
          consumedWeight: newConsumed.toFixed(2),
          remainingWeight: newRemaining.toFixed(2),
          status: newStatus,
        });

        await invDb.createMovement({
          movementDate: new Date().toISOString().split("T")[0],
          movementTime: new Date().toTimeString().slice(0, 5),
          movementType: "consume_for_packing",
          inventoryType: "harvested",
          itemId: input.id,
          itemBarcode: item.barcode,
          weight: input.consumeWeight,
          userId: ctx.user.id,
          notes: input.notes,
        });

        return { success: true, newRemaining: newRemaining.toFixed(2), newStatus };
      }),

    // Move to packing area
    moveToPackingArea: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input, ctx }) => invDb.moveToPackingArea(input.id, ctx.user.id)),

    // Create full packing result
    createPackingResult: protectedProcedure
      .input(z.object({
        packingDate: z.string(),
        packingTime: z.string().optional(),
        productType: z.enum(['white_basket', 'brown_basket', 'mix', 'filling']),
        packagingTypeId: z.number(),
        categoryId: z.number(),
        sizeId: z.number().optional(),
        harvestWave: z.number().min(1).max(3),
        packedWeight: z.string(),
        unitCount: z.number().int().positive(),
        basketCount: z.number().int().optional(),
        packerId: z.number().optional(),
        productCatalogId: z.number().optional(),
        expiryDate: z.string().optional(),
        storageLocation: z.string().optional(),
        notes: z.string().optional(),
        sources: z.array(z.object({
          harvestedInventoryId: z.number(),
          weightUsed: z.string(),
          basketsUsed: z.number().int().optional(),
        })).min(1),
      }))
      .mutation(({ input, ctx }) => invDb.createPackingResult({ ...input, createdByUserId: ctx.user.id })),

    // Downgrade during packing
    createDowngrade: protectedProcedure
      .input(z.object({
        sourceHarvestedInventoryId: z.number(),
        downgradeDate: z.string(),
        downgradeWeight: z.string(),
        reason: z.string().optional(),
        roomId: z.number(),
        harvestWave: z.number(),
        employeeId: z.number(),
        sizeId: z.number(),
        categoryId: z.number(),
      }))
      .mutation(({ input, ctx }) => invDb.createDowngrade({
        ...input,
        reason: input.reason ?? '',
        userId: ctx.user.id,
      })),

    // Cold room summary
    coldRoomSummary: protectedProcedure
      .query(() => invDb.getColdRoomSummary()),

    // Yield summary
    yieldSummary: protectedProcedure
      .input(z.object({ startDate: z.string(), endDate: z.string() }))
      .query(({ input }) => invDb.getYieldSummary(input.startDate, input.endDate)),

    // Packed inventory
    packedList: protectedProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        categoryId: z.number().optional(),
        packagingTypeId: z.number().optional(),
        harvestWave: z.number().optional(),
        status: z.string().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      }).optional())
      .query(({ input }) => invDb.listPackedInventory(input ?? {})),

    packedGet: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => invDb.getPackedItem(input.id)),

    packedCreate: protectedProcedure
      .input(z.object({
        packingDate: z.string(),
        packingTime: z.string().optional(),
        harvestWave: z.number().min(1).max(5),
        categoryId: z.number(),
        sizeId: z.number().optional(),
        packagingTypeId: z.number(),
        packedWeight: z.string(),
        unitCount: z.number().int().positive(),
        storageLocation: z.string().optional(),
        expiryDate: z.string().optional(),
        notes: z.string().optional(),
        sourceItems: z.array(z.object({
          harvestedInventoryId: z.number(),
          weightUsed: z.string(),
        })).optional().default([]),
      }))
      .mutation(async ({ input, ctx }) => {
        // Generate barcode: P-YYMMDD-LN-SSSS
        const dateCode = invDb.formatDateCode(input.packingDate);
        const pkgCode = String(input.packagingTypeId).padStart(2, "0");
        const barcode = await invDb.getNextBarcode("P", dateCode, pkgCode);
        const batchNumber = `P-${dateCode}-${pkgCode}`;

        const result = await invDb.createPackedItem({
          barcode,
          batchNumber,
          packingDate: input.packingDate,
          packingTime: input.packingTime,
          harvestWave: input.harvestWave,
          categoryId: input.categoryId,
          sizeId: input.sizeId,
          packagingTypeId: input.packagingTypeId,
          packedWeight: input.packedWeight,
          unitCount: input.unitCount,
          storageLocation: input.storageLocation,
          expiryDate: input.expiryDate,
          notes: input.notes,
          createdByUserId: ctx.user.id,
        });

        // Create source links
        for (const src of input.sourceItems) {
          await invDb.createPackedSourceLink({
            packedInventoryId: result.id,
            harvestedInventoryId: src.harvestedInventoryId,
            weightUsed: src.weightUsed,
          });
        }

        // Record movement
        await invDb.createMovement({
          movementDate: input.packingDate,
          movementTime: input.packingTime,
          movementType: "packed_intake",
          inventoryType: "packed",
          itemId: result.id,
          itemBarcode: barcode,
          weight: input.packedWeight,
          quantity: input.unitCount,
          userId: ctx.user.id,
        });

        return { id: result.id, barcode };
      }),

    // Outbound - ship packed item
    packedShip: protectedProcedure
      .input(z.object({
        barcode: z.string(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const item = await invDb.getPackedItemByBarcode(input.barcode);
        if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Barcode not found in packed inventory" });
        if (item.status === "shipped") throw new TRPCError({ code: "BAD_REQUEST", message: "This item has already been shipped" });
        if (item.status !== "available") throw new TRPCError({ code: "BAD_REQUEST", message: `Item status is '${item.status}' and cannot be shipped` });

        await invDb.updatePackedItem(item.id, { status: "shipped" });

        await invDb.createMovement({
          movementDate: new Date().toISOString().split("T")[0],
          movementTime: new Date().toTimeString().slice(0, 5),
          movementType: "outbound",
          inventoryType: "packed",
          itemId: item.id,
          itemBarcode: item.barcode,
          weight: String(item.packedWeight),
          quantity: item.unitCount,
          userId: ctx.user.id,
          notes: input.notes,
        });

        return { success: true, item };
      }),

    // Movements log
    movements: protectedProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        movementType: z.string().optional(),
        inventoryType: z.string().optional(),
        itemBarcode: z.string().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      }).optional())
      .query(({ input }) => invDb.listMovements(input ?? {})),

    // Traceability
    traceability: protectedProcedure
      .input(z.object({ packedId: z.number() }))
      .query(({ input }) => invDb.getTraceabilityForPacked(input.packedId)),

    sourceLinks: protectedProcedure
      .input(z.object({ packedId: z.number() }))
      .query(({ input }) => invDb.getSourceLinksForPacked(input.packedId)),
  }),

  // ============ GROW CYCLES ============

  growCycles: router({
    list: protectedProcedure
      .input(z.object({ roomId: z.number().optional(), status: z.string().optional() }).optional())
      .query(({ input }) => db.listGrowCycles(input?.roomId, input?.status)),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getGrowCycle(input.id)),

    getActiveForRoom: protectedProcedure
      .input(z.object({ roomId: z.number() }))
      .query(({ input }) => db.getActiveGrowCycleForRoom(input.roomId)),

    create: adminProcedure
      .input(z.object({
        roomId: z.number(),
        startDate: z.string(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const cycleNumber = await db.getNextCycleNumber(input.roomId);
        return db.createGrowCycle({ ...input, cycleNumber, createdByUserId: ctx.user.id });
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(['active', 'harvesting', 'completed']).optional(),
        endDate: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(({ input }) => { const { id, ...data } = input; return db.updateGrowCycle(id, data); }),
  }),

  // ============ CUSTOMERS ============

  customers: router({
    list: protectedProcedure
      .input(z.object({ status: z.string().optional() }).optional())
      .query(({ input }) => db.listCustomers(input?.status)),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getCustomer(input.id)),

    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        rivuchitAccountNumber: z.string().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(({ input }) => db.createCustomer(input)),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        rivuchitAccountNumber: z.string().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        notes: z.string().optional(),
        status: z.enum(['active', 'inactive']).optional(),
      }))
      .mutation(({ input }) => { const { id, ...data } = input; return db.updateCustomer(id, data); }),
  }),

  // ============ DELIVERIES ============

  deliveries: router({
    list: protectedProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        customerId: z.number().optional(),
        status: z.string().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      }).optional())
      .query(({ input }) => db.listDeliveries(input ?? {})),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getDelivery(input.id)),

    create: protectedProcedure
      .input(z.object({
        customerId: z.number().optional(),
        deliveryDate: z.string(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => db.createDelivery({ ...input, createdByUserId: ctx.user.id })),

    addItem: protectedProcedure
      .input(z.object({ deliveryId: z.number(), packedInventoryId: z.number() }))
      .mutation(({ input }) => db.addDeliveryItem(input.deliveryId, input.packedInventoryId)),

    removeItem: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => db.removeDeliveryItem(input.id)),

    dispatch: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input, ctx }) => db.dispatchDelivery(input.id, ctx.user.id)),

    getItems: protectedProcedure
      .input(z.object({ deliveryId: z.number() }))
      .query(({ input }) => db.getDeliveryItems(input.deliveryId)),
  }),

  // ============ PRODUCT CATALOG ============

  productCatalog: router({
    list: protectedProcedure
      .input(z.object({ status: z.string().optional() }).optional())
      .query(({ input }) => db.listProductCatalog(input?.status)),

    create: adminProcedure
      .input(z.object({
        rivuchitProductId: z.number(),
        nameHebrew: z.string().min(1),
        nameEnglish: z.string().optional(),
        productType: z.enum(['white_basket', 'brown_basket', 'mix', 'white_filling', 'brown_filling', 'white_small', 'brown_small']),
        unitDescription: z.string().min(1),
        pricePerUnit: z.string(),
        isSpecialCustomer: z.boolean().optional(),
      }))
      .mutation(({ input }) => db.createProductCatalogItem({
        ...input,
        isSpecialCustomer: input.isSpecialCustomer ? 1 : 0,
      })),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        rivuchitProductId: z.number().optional(),
        nameHebrew: z.string().optional(),
        nameEnglish: z.string().optional(),
        productType: z.enum(['white_basket', 'brown_basket', 'mix', 'white_filling', 'brown_filling', 'white_small', 'brown_small']).optional(),
        unitDescription: z.string().optional(),
        pricePerUnit: z.string().optional(),
        isSpecialCustomer: z.boolean().optional(),
        status: z.enum(['active', 'inactive']).optional(),
      }))
      .mutation(({ input }) => {
        const { id, isSpecialCustomer, ...rest } = input;
        const data: Record<string, any> = { ...rest };
        if (isSpecialCustomer !== undefined) data.isSpecialCustomer = isSpecialCustomer ? 1 : 0;
        return db.updateProductCatalogItem(id, data);
      }),

    monthlyExport: protectedProcedure
      .input(z.object({ year: z.number(), month: z.number() }))
      .query(({ input }) => db.getMonthlyExportData(input.year, input.month)),
  }),

  reports: router({
    dailySummary: protectedProcedure
      .input(z.object({ date: z.string() }))
      .query(({ input }) => db.getDailySummary(input.date)),
    byEmployee: protectedProcedure
      .input(z.object({ startDate: z.string(), endDate: z.string() }))
      .query(({ input }) => db.getReportByEmployee(input.startDate, input.endDate)),
    byRoom: protectedProcedure
      .input(z.object({ startDate: z.string(), endDate: z.string() }))
      .query(({ input }) => db.getReportByRoom(input.startDate, input.endDate)),
    byShift: protectedProcedure
      .input(z.object({ startDate: z.string(), endDate: z.string() }))
      .query(({ input }) => db.getReportByShift(input.startDate, input.endDate)),
    dashboard: protectedProcedure
      .input(z.object({ startDate: z.string(), endDate: z.string() }))
      .query(({ input }) => db.getDashboardData(input.startDate, input.endDate)),
    exportData: protectedProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        employeeId: z.number().optional(),
        roomId: z.number().optional(),
        shiftId: z.number().optional(),
      }))
      .query(({ input }) => db.getHarvestRecordsForExport(input)),
  }),
});

export type AppRouter = typeof appRouter;
