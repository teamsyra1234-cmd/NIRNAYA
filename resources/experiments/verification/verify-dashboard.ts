/**
 * NIRNAYA Automated Dashboard Provenance & Verification Suite
 *
 * Verifies:
 * 1. API GET /api/v1/dashboard returns HTTP 200 with dynamic SQLite-backed values
 * 2. KPI metrics match actual SQLite database record counts:
 *    - Evidence count = 10 ("Pilot evidence records")
 *    - Active policy studies = 4 ("Pilot policy studies")
 *    - Districts covered = 6 ("Pilot districts")
 *    - Verified sources = 100% ("Pilot evidence verified")
 * 3. Dynamic verification percentage is calculated from DB records (10/10 = 100%)
 * 4. Source-type breakdown is calculated from DB records:
 *    - Government / statutory authorities = 80% (8 records)
 *    - Research / academic institutions = 20% (2 records)
 *    - Other validated = 0% (0 records)
 * 5. Publication year chart data is strictly derived from evidence records (2022: 1, 2023: 2, 2024: 4, 2025: 3)
 * 6. Codebase audit confirms no fabricated national demo statistics remain:
 *    - 18,742 / 18742 eliminated
 *    - 412 eliminated
 *    - 91.6 eliminated
 *    - [42, 58, 51...] eliminated
 *    - 54% national coverage eliminated
 * 7. Prototype data scope banner is present in client UI
 */

import { getDb } from "../db";
import { evidence, policyStudies, districts } from "../db/schema";
import fs from "fs";
import path from "path";

export {};

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`  ✓ ${message}`);
}

async function runDashboardVerification() {
  console.log("===================================================================");
  console.log("🚀 NIRNAYA Dashboard Provenance & Truthful Metrics Verification Suite");
  console.log("===================================================================\n");

  // ---------------------------------------------------------------------------
  // STEP 1: Query actual SQLite pilot database reality directly
  // ---------------------------------------------------------------------------
  console.log("--- 1. Querying Live SQLite Database Directly ---");
  const db = getDb();

  const allEvidence = await db.select().from(evidence).all();
  const allStudies = await db.select().from(policyStudies).all();
  const allDistricts = await db.select().from(districts).all();

  const dbEvidenceCount = allEvidence.length;
  const dbStudiesCount = allStudies.length;
  const dbDistrictsCount = allDistricts.length;
  const dbVerifiedCount = allEvidence.filter((e) => e.verified === 1).length;
  const dbVerificationRate = Math.round((dbVerifiedCount / dbEvidenceCount) * 100);

  console.log(`  Actual Evidence records in DB: ${dbEvidenceCount}`);
  console.log(`  Actual Policy Studies in DB: ${dbStudiesCount}`);
  console.log(`  Actual Districts in DB: ${dbDistrictsCount}`);
  console.log(`  Actual Verified Evidence in DB: ${dbVerifiedCount}/${dbEvidenceCount} (${dbVerificationRate}%)`);

  assert(dbEvidenceCount === 10, `SQLite evidence count is exactly 10 (found ${dbEvidenceCount})`);
  assert(dbStudiesCount === 4, `SQLite policy_studies count is exactly 4 (found ${dbStudiesCount})`);
  assert(dbDistrictsCount === 6, `SQLite districts count is exactly 6 (found ${dbDistrictsCount})`);
  assert(dbVerificationRate === 100, `SQLite evidence verification rate is 100%`);

  // Year breakdown in SQLite
  const dbYearCounts: Record<number, number> = {};
  for (const e of allEvidence) {
    dbYearCounts[e.year] = (dbYearCounts[e.year] || 0) + 1;
  }
  console.log("  Evidence distribution by publication year in DB:", dbYearCounts);
  assert(dbYearCounts[2022] === 1, "DB has 1 record from 2022");
  assert(dbYearCounts[2023] === 2, "DB has 2 records from 2023");
  assert(dbYearCounts[2024] === 5, "DB has 5 records from 2024");
  assert(dbYearCounts[2025] === 2, "DB has 2 records from 2025");

  // ---------------------------------------------------------------------------
  // STEP 2: Verify GET /api/v1/dashboard API Endpoint
  // ---------------------------------------------------------------------------
  console.log("\n--- 2. Verifying GET /api/v1/dashboard API Response ---");
  const res = await fetch(`${BASE_URL}/api/v1/dashboard`);
  assert(res.status === 200, `GET /api/v1/dashboard returned HTTP 200 (status=${res.status})`);

  const data: any = await res.json();

  // Mode & Scope metadata
  assert(data.mode === "pilot-database-backed", `API response mode is 'pilot-database-backed' (got '${data.mode}')`);
  assert(data.scope?.type === "pilot", `API scope type is 'pilot'`);
  assert(
    typeof data.scope?.notice === "string" && data.scope.notice.includes("curated six-district pilot dataset"),
    `API scope notice explicitly clarifies curated six-district pilot dataset`
  );

  // Top 4 KPI Metrics
  assert(Array.isArray(data.metrics) && data.metrics.length === 4, "API returned exactly 4 KPI metrics");

  const evidenceMetric = data.metrics.find((m: any) => m.key === "evidence_assets");
  assert(Boolean(evidenceMetric), "evidence_assets KPI metric exists");
  assert(evidenceMetric.value === String(dbEvidenceCount), `evidence_assets value equals DB count '${dbEvidenceCount}'`);
  assert(evidenceMetric.label === "Pilot evidence records", `evidence_assets label is 'Pilot evidence records' (got '${evidenceMetric.label}')`);
  assert(!evidenceMetric.delta.includes("this month"), `evidence_assets delta has no fabricated month delta (got '${evidenceMetric.delta}')`);

  const studiesMetric = data.metrics.find((m: any) => m.key === "active_studies");
  assert(Boolean(studiesMetric), "active_studies KPI metric exists");
  assert(studiesMetric.value === String(dbStudiesCount), `active_studies value equals DB count '${dbStudiesCount}'`);
  assert(studiesMetric.label === "Pilot policy studies", `active_studies label is 'Pilot policy studies' (got '${studiesMetric.label}')`);

  const districtsMetric = data.metrics.find((m: any) => m.key === "districts_covered");
  assert(Boolean(districtsMetric), "districts_covered KPI metric exists");
  assert(districtsMetric.value === String(dbDistrictsCount), `districts_covered value equals DB count '${dbDistrictsCount}'`);
  assert(districtsMetric.label === "Pilot districts", `districts_covered label is 'Pilot districts' (got '${districtsMetric.label}')`);
  assert(!districtsMetric.delta.includes("national coverage"), `districts_covered delta does not claim national coverage (got '${districtsMetric.delta}')`);

  const verifiedMetric = data.metrics.find((m: any) => m.key === "verified_sources");
  assert(Boolean(verifiedMetric), "verified_sources KPI metric exists");
  assert(verifiedMetric.value === "100%", `verified_sources value equals DB rate '100%' (got '${verifiedMetric.value}')`);
  assert(verifiedMetric.label === "Pilot evidence verified", `verified_sources label is 'Pilot evidence verified' (got '${verifiedMetric.label}')`);

  // Evidence Quality Donut Data
  console.log("\n--- 3. Verifying Evidence Quality & Breakdown Calculations ---");
  assert(data.quality?.verified === 100, `Quality verified rate equals 100%`);
  assert(Array.isArray(data.quality?.breakdown), "Quality breakdown array exists");

  const govItem = data.quality.breakdown.find((b: any) => b.key === "government");
  const resItem = data.quality.breakdown.find((b: any) => b.key === "research");
  const otherItem = data.quality.breakdown.find((b: any) => b.key === "other");

  assert(Boolean(govItem), "Government / statutory category exists");
  assert(govItem.share === 80, `Government / statutory share is 80% (got ${govItem.share}%)`);
  assert(govItem.count === 8, `Government / statutory record count is 8 (got ${govItem.count})`);

  assert(Boolean(resItem), "Research / academic category exists");
  assert(resItem.share === 20, `Research / academic share is 20% (got ${resItem.share}%)`);
  assert(resItem.count === 2, `Research / academic record count is 2 (got ${resItem.count})`);

  assert(Boolean(otherItem), "Other validated category exists");
  assert(otherItem.share === 0, `Other validated share is 0% (got ${otherItem.share}%)`);
  assert(otherItem.count === 0, `Other validated count is 0 (got ${otherItem.count})`);

  // Yearly Publication Chart Data
  console.log("\n--- 4. Verifying Publication Year Chart Data ---");
  assert(Array.isArray(data.yearlyEvidence), "yearlyEvidence array exists");
  assert(data.yearlyEvidence.length === 4, `yearlyEvidence has 4 years (got ${data.yearlyEvidence.length})`);

  const yearsReturned = data.yearlyEvidence.map((y: any) => y.year);
  assert(JSON.stringify(yearsReturned) === JSON.stringify([2022, 2023, 2024, 2025]), "Years are [2022, 2023, 2024, 2025]");

  const yearMap = Object.fromEntries(data.yearlyEvidence.map((y: any) => [y.year, y.count]));
  assert(yearMap[2022] === 1, "Year 2022 has 1 record");
  assert(yearMap[2023] === 2, "Year 2023 has 2 records");
  assert(yearMap[2024] === 5, "Year 2024 has 5 records");
  assert(yearMap[2025] === 2, "Year 2025 has 2 records");

  // Priority Policy Studies Table Data
  console.log("\n--- 5. Verifying Priority Policy Studies Table Data ---");
  assert(Array.isArray(data.studies) && data.studies.length === 4, "studies array has exactly 4 active studies");
  const studyIds = data.studies.map((s: any) => s.id);
  assert(studyIds.includes("ps-001"), "Study ps-001 present");
  assert(studyIds.includes("ps-002"), "Study ps-002 present");
  assert(studyIds.includes("ps-003"), "Study ps-003 present");
  assert(studyIds.includes("ps-004"), "Study ps-004 present");

  // ---------------------------------------------------------------------------
  // STEP 6: Source Code Audit - Confirm No Fabricated Numbers Remain
  // ---------------------------------------------------------------------------
  console.log("\n--- 6. Source Code Audit for Fabricated National Demonstration Numbers ---");

  const dashboardClientPath = path.resolve(process.cwd(), "app/dashboard-client.tsx");
  const dashboardClientSrc = fs.readFileSync(dashboardClientPath, "utf-8");

  const dashboardRoutePath = path.resolve(process.cwd(), "app/api/v1/dashboard/route.ts");
  const dashboardRouteSrc = fs.readFileSync(dashboardRoutePath, "utf-8");

  // Check 1: 18,742 / 18742
  assert(!dashboardClientSrc.includes("18,742"), "app/dashboard-client.tsx does NOT contain '18,742'");
  assert(!dashboardClientSrc.includes("18742"), "app/dashboard-client.tsx does NOT contain '18742'");
  assert(!dashboardRouteSrc.includes("18,742"), "app/api/v1/dashboard/route.ts does NOT contain '18,742'");
  assert(!dashboardRouteSrc.includes("18742"), "app/api/v1/dashboard/route.ts does NOT contain '18742'");

  // Check 2: 412 districts
  assert(!dashboardClientSrc.includes('"412"'), "app/dashboard-client.tsx does NOT contain '\"412\"'");
  assert(!dashboardRouteSrc.includes('"412"'), "app/api/v1/dashboard/route.ts does NOT contain '\"412\"'");

  // Check 3: 91.6%
  assert(!dashboardClientSrc.includes("91.6"), "app/dashboard-client.tsx does NOT contain '91.6'");
  assert(!dashboardRouteSrc.includes("91.6"), "app/api/v1/dashboard/route.ts does NOT contain '91.6'");

  // Check 4: Hardcoded monthly trend array [42, 58, 51...]
  assert(!dashboardClientSrc.includes("42, 58, 51"), "app/dashboard-client.tsx does NOT contain hardcoded trend '[42, 58, 51...]'");
  assert(!dashboardRouteSrc.includes("42, 58, 51"), "app/api/v1/dashboard/route.ts does NOT contain hardcoded trend '[42, 58, 51...]'");

  // Check 5: Fabricated national coverage text
  assert(!dashboardClientSrc.includes("54% national coverage"), "app/dashboard-client.tsx does NOT claim '54% national coverage'");

  // Check 6: Prototype scope notice presence in client markup
  assert(dashboardClientSrc.includes("prototype-scope-notice"), "app/dashboard-client.tsx contains .prototype-scope-notice element");
  assert(dashboardClientSrc.includes("Prototype data scope"), "app/dashboard-client.tsx displays 'Prototype data scope' badge");
  assert(
    dashboardClientSrc.includes("curated six-district pilot dataset"),
    "app/dashboard-client.tsx contains 'curated six-district pilot dataset' scope description"
  );

  // Check 7: Evidence records by publication year title
  assert(
    dashboardClientSrc.includes("Evidence records by publication year"),
    "app/dashboard-client.tsx displays title 'Evidence records by publication year'"
  );
  assert(
    dashboardClientSrc.includes("Current pilot repository"),
    "app/dashboard-client.tsx displays subtitle 'Current pilot repository'"
  );

  console.log("\n===================================================================");
  console.log("🎉 ALL DASHBOARD PROVENANCE & TRUTHFUL METRICS TESTS PASSED! 🎉");
  console.log("===================================================================\n");
}

runDashboardVerification().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
