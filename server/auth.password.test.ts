import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import bcrypt from "bcryptjs";

// Mock the db module
vi.mock("./db", () => ({
  getUserByEmail: vi.fn(),
  getUserById: vi.fn(),
  listUsers: vi.fn(),
  updateUserRole: vi.fn(),
  linkEmployeeToUser: vi.fn(),
  createUserWithPassword: vi.fn(),
  updateUserPassword: vi.fn(),
  deleteUser: vi.fn(),
  getEmployeeByUserId: vi.fn(),
  updateUserLastSignedIn: vi.fn(),
  upsertUser: vi.fn(),
  mergeUserByEmail: vi.fn(),
  createUserByEmail: vi.fn(),
}));

// Mock inventory-db
vi.mock("./inventory-db", () => ({
  listInventoryItems: vi.fn(),
  getInventoryItem: vi.fn(),
  createInventoryItem: vi.fn(),
  updateInventoryItem: vi.fn(),
  deleteInventoryItem: vi.fn(),
  listMovements: vi.fn(),
  createMovement: vi.fn(),
  getInventoryStats: vi.fn(),
}));

import * as db from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "local_admin_123",
    email: "admin@test.com",
    name: "Admin User",
    loginMethod: "password",
    role: "admin",
    passwordHash: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
      cookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createWorkerContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "local_worker_123",
    email: "worker@test.com",
    name: "Worker User",
    loginMethod: "password",
    role: "user",
    passwordHash: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
      cookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
      cookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("users.createUser (password-based)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("admin can create a user with email and password", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    vi.mocked(db.getUserByEmail).mockResolvedValue(null);
    vi.mocked(db.createUserWithPassword).mockResolvedValue({ id: 10, openId: "local_123" });

    const result = await caller.users.createUser({
      name: "New Worker",
      email: "worker@example.com",
      password: "pass1234",
      role: "user",
    });

    expect(result).toEqual({ success: true, userId: 10 });
    expect(db.getUserByEmail).toHaveBeenCalledWith("worker@example.com");
    expect(db.createUserWithPassword).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "New Worker",
        email: "worker@example.com",
        role: "user",
      })
    );
    // Verify password was hashed
    const callArgs = vi.mocked(db.createUserWithPassword).mock.calls[0][0];
    expect(callArgs.passwordHash).toBeTruthy();
    expect(callArgs.passwordHash).not.toBe("pass1234"); // Should be hashed
    const isValid = await bcrypt.compare("pass1234", callArgs.passwordHash);
    expect(isValid).toBe(true);
  });

  it("rejects duplicate email", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    vi.mocked(db.getUserByEmail).mockResolvedValue({
      id: 5,
      openId: "existing",
      email: "worker@example.com",
      name: "Existing",
      loginMethod: "password",
      role: "user",
      passwordHash: "hash",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    });

    await expect(
      caller.users.createUser({
        name: "New Worker",
        email: "worker@example.com",
        password: "pass1234",
        role: "user",
      })
    ).rejects.toThrow("A user with this email already exists");
  });

  it("non-admin cannot create users", async () => {
    const ctx = createWorkerContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.users.createUser({
        name: "New Worker",
        email: "worker@example.com",
        password: "pass1234",
        role: "user",
      })
    ).rejects.toThrow();
  });

  it("unauthenticated user cannot create users", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.users.createUser({
        name: "New Worker",
        email: "worker@example.com",
        password: "pass1234",
        role: "user",
      })
    ).rejects.toThrow();
  });

  it("rejects password shorter than 4 characters", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.users.createUser({
        name: "New Worker",
        email: "worker@example.com",
        password: "abc",
        role: "user",
      })
    ).rejects.toThrow();
  });
});

describe("users.resetPassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("admin can reset a user's password", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    vi.mocked(db.getUserById).mockResolvedValue({
      id: 5,
      openId: "local_5",
      email: "worker@example.com",
      name: "Worker",
      loginMethod: "password",
      role: "user",
      passwordHash: "oldhash",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    });

    const result = await caller.users.resetPassword({
      userId: 5,
      newPassword: "newpass123",
    });

    expect(result).toEqual({ success: true });
    expect(db.updateUserPassword).toHaveBeenCalledWith(5, expect.any(String));

    // Verify the new password hash is valid
    const newHash = vi.mocked(db.updateUserPassword).mock.calls[0][1];
    const isValid = await bcrypt.compare("newpass123", newHash);
    expect(isValid).toBe(true);
  });

  it("rejects reset for non-existent user", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    vi.mocked(db.getUserById).mockResolvedValue(null);

    await expect(
      caller.users.resetPassword({
        userId: 999,
        newPassword: "newpass123",
      })
    ).rejects.toThrow("User not found");
  });

  it("non-admin cannot reset passwords", async () => {
    const ctx = createWorkerContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.users.resetPassword({
        userId: 5,
        newPassword: "newpass123",
      })
    ).rejects.toThrow();
  });

  it("rejects new password shorter than 4 characters", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.users.resetPassword({
        userId: 5,
        newPassword: "ab",
      })
    ).rejects.toThrow();
  });
});
