import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";

export async function runMigrations() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.warn("[migrate] No DATABASE_URL — skipping migrations");
    return;
  }

  let connection: mysql.Connection | null = null;
  try {
    connection = await mysql.createConnection(url);

    // Track which migrations have run
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        run_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const [rows] = await connection.execute("SELECT filename FROM _migrations");
    const done = new Set((rows as { filename: string }[]).map((r) => r.filename));

    // SQL files live next to the server in production (copied by Dockerfile)
    // and in /drizzle relative to project root in development
    const candidates = [
      path.resolve(import.meta.dirname, "drizzle"),       // production: /app/drizzle
      path.resolve(import.meta.dirname, "..", "drizzle"), // dev: project root/drizzle
    ];
    const migrationsDir = candidates.find((d) => fs.existsSync(d));

    if (!migrationsDir) {
      console.warn("[migrate] Could not find drizzle/ folder — skipping");
      return;
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      if (done.has(file)) {
        continue;
      }

      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");

      // Split on semicolons, skip empty / comment-only lines
      const statements = sql
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !s.startsWith("--"));

      for (const stmt of statements) {
        try {
          await connection.execute(stmt);
        } catch (stmtErr: any) {
          // Ignore "already exists" errors — migration partially ran before
          const ignorable = [
            1050, // ER_TABLE_EXISTS_ERROR  — CREATE TABLE
            1060, // ER_DUP_FIELDNAME       — ALTER TABLE ADD COLUMN
            1061, // ER_DUP_KEYNAME         — CREATE INDEX / ADD KEY
            1068, // ER_MULTIPLE_PRI_KEY    — multiple primary keys
          ];
          if (ignorable.includes(stmtErr.errno)) {
            console.warn(`[migrate] skipping (already exists): ${stmtErr.sqlMessage}`);
          } else {
            throw stmtErr;
          }
        }
      }

      await connection.execute("INSERT INTO _migrations (filename) VALUES (?)", [file]);
      console.log(`[migrate] ✓ ${file}`);
    }

    console.log("[migrate] All migrations complete");
  } catch (err) {
    console.error("[migrate] Migration failed:", err);
    throw err;
  } finally {
    await connection?.end();
  }
}

export async function ensureAdminUser() {
  const url = process.env.DATABASE_URL;
  if (!url) return;

  let connection: mysql.Connection | null = null;
  try {
    connection = await mysql.createConnection(url);

    const [rows] = await connection.execute("SELECT COUNT(*) as count FROM users");
    const count = (rows as { count: number }[])[0].count;

    if (count > 0) return; // users already exist

    // bcryptjs — dynamic import keeps it out of the bundle analysis
    const bcrypt = await import("bcryptjs");
    const hash = bcrypt.hashSync("Patrioti2026!", 10);

    await connection.execute(
      `INSERT INTO users (openId, name, email, passwordHash, loginMethod, role)
       VALUES ('admin-auto-001', 'Admin', 'admin@patrioti.co.il', ?, 'password', 'admin')`,
      [hash]
    );
    console.log("[migrate] ✓ Default admin created — email: admin@patrioti.co.il  password: Patrioti2026!");
  } catch (err) {
    console.error("[migrate] Failed to create admin user:", err);
  } finally {
    await connection?.end();
  }
}
