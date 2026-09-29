import { createClient } from "@libsql/client";
import path from "path";

async function init() {
  const dbPath = path.resolve(process.cwd(), "nirnaya.db");
  const client = createClient({ url: `file:${dbPath}` });
  await client.execute(`
    CREATE TABLE IF NOT EXISTS ogd_records (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL DEFAULT 'Open Government Data Platform India',
      authority TEXT NOT NULL,
      dataset_title TEXT NOT NULL,
      catalog_id TEXT NOT NULL,
      resource_id TEXT NOT NULL,
      source_url TEXT NOT NULL,
      retrieved_at TEXT NOT NULL,
      publication_date TEXT,
      geography TEXT NOT NULL,
      state TEXT,
      district TEXT,
      record_identifier TEXT,
      checksum TEXT NOT NULL,
      payload TEXT NOT NULL,
      is_official INTEGER NOT NULL DEFAULT 1
    );
  `);
  console.log("✓ ogd_records table created successfully in nirnaya.db");
}

init().catch(console.error);
