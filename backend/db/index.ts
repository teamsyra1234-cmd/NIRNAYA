import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";
import path from "path";

let clientInstance: Client | null = null;
let dbInstance: LibSQLDatabase<typeof schema> | null = null;
let migrationsEnsured = false;

function ensureColumns(client: Client) {
  if (migrationsEnsured) return;
  migrationsEnsured = true;
  try {
    const cols = [
      "user_id",
      "district_name",
      "intervention_id",
      "intervention_name",
      "parameters",
      "baseline_data",
      "scenario_data",
    ];
    for (const c of cols) {
      client.execute(`ALTER TABLE scenario_runs ADD COLUMN ${c} TEXT`).catch(() => {});
    }
  } catch {}
}

export function getDb(): LibSQLDatabase<typeof schema> {
  if (!dbInstance) {
    const dbPath = path.resolve(process.cwd(), "nirnaya.db");
    clientInstance = createClient({
      url: `file:${dbPath}`,
    });
    ensureColumns(clientInstance);
    dbInstance = drizzle(clientInstance, { schema });
  }
  return dbInstance;
}

export function getRawClient(): Client {
  if (!clientInstance) {
    getDb();
  }
  return clientInstance!;
}
