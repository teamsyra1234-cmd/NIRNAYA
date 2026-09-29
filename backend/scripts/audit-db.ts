import { createClient } from "@libsql/client";
import path from "path";

async function audit() {
  const dbPath = path.resolve(process.cwd(), "nirnaya.db");
  const client = createClient({ url: `file:${dbPath}` });

  console.log("=== NIRNAYA DATABASE RECORD COUNTS ===");
  const tables = ["evidence", "policy_studies", "districts", "connectors", "dashboard_metrics", "scenario_runs", "users"];
  for (const t of tables) {
    try {
      const res = await client.execute(`SELECT count(*) as cnt FROM ${t}`);
      console.log(`Table '${t}': ${res.rows[0].cnt} records`);
    } catch (e: any) {
      console.log(`Table '${t}': Error (${e.message})`);
    }
  }

  console.log("\n=== DASHBOARD_METRICS TABLE ROWS ===");
  const metrics = await client.execute("SELECT * FROM dashboard_metrics ORDER BY sort_order ASC");
  console.log(JSON.stringify(metrics.rows, null, 2));

  console.log("\n=== POLICY_STUDIES TABLE ROWS ===");
  const studies = await client.execute("SELECT id, title, state, stage, readiness_score, owner FROM policy_studies");
  console.log(`Total policy studies in DB: ${studies.rows.length}`);
  console.log(JSON.stringify(studies.rows, null, 2));

  console.log("\n=== EVIDENCE TABLE SUMMARY ===");
  const evTotal = await client.execute("SELECT count(*) as total, sum(verified) as verified_count, avg(score) as avg_score FROM evidence");
  console.log(JSON.stringify(evTotal.rows[0], null, 2));

  console.log("\n=== DISTRICTS TABLE SUMMARY ===");
  const distTotal = await client.execute("SELECT count(*) as total, count(distinct state) as state_count FROM districts");
  console.log(JSON.stringify(distTotal.rows[0], null, 2));
}

audit().catch(console.error);
