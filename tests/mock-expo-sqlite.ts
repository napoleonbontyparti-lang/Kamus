// Подмена expo-sqlite для тестов в Node: node:sqlite с тем же API
import { DatabaseSync } from "node:sqlite";
const wrap = (d: any) => ({
  getAllAsync: async (sql: string, p: any[] = []) => d.prepare(sql).all(...p),
  getFirstAsync: async (sql: string, p: any[] = []) => d.prepare(sql).get(...p) ?? null,
  getAllSync: (sql: string, p: any[] = []) => d.prepare(sql).all(...p),
  getFirstSync: (sql: string, p: any[] = []) => d.prepare(sql).get(...p) ?? null,
  runSync: (sql: string, p: any[] = []) => { const r = d.prepare(sql).run(...p); return { lastInsertRowId: r.lastInsertRowid, changes: r.changes }; },
  execSync: (sql: string) => d.exec(sql),
});
export const openDatabaseSync = (name: string) => wrap(new DatabaseSync(name === "user.db" ? ":memory:" : name));
export const openTest = (path: string) => wrap(new DatabaseSync(path, { readOnly: true }));
export type SQLiteDatabase = any;
