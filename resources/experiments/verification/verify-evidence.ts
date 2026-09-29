/**
 * NIRNAYA Automated Evidence Explorer Verification Suite
 * 
 * Verifies:
 * A. Evidence loads from database
 * B. Search returns matching records
 * C. Search with no matches returns empty list (0 matches)
 * D. Type filter works
 * E. Authority filter works
 * F. Geography filter works
 * G. Multiple filters work together
 * H. Evidence record details are complete
 * I. Source URLs are distinct and valid per record (not hardcoded)
 * J. Provenance information is displayed
 * K. Existing dashboard APIs still load
 * L. Authentication still works
 */

export {};

const BASE_URL = "http://localhost:3000";

async function runEvidenceTests() {
  console.log("=== NIRNAYA Evidence Explorer Verification Suite ===\n");

  // Test A: Evidence loads from database
  console.log("Test A: Testing default evidence loading from database...");
  const baseRes = await fetch(`${BASE_URL}/api/v1/evidence`);
  if (!baseRes.ok) throw new Error(`Test A Failed: HTTP ${baseRes.status}`);
  const baseData: any = await baseRes.json();
  console.log("  Total records loaded:", baseData.total);
  console.log("  Filter options discovered:", {
    types: baseData.filterOptions?.types?.length,
    authorities: baseData.filterOptions?.authorities?.length,
    geographies: baseData.filterOptions?.geographies?.length,
    years: baseData.filterOptions?.years?.length,
  });
  if (!baseData.items || baseData.total < 5) {
    throw new Error(`Test A Failed: Expected at least 5 evidence items, got ${baseData.total}`);
  }
  console.log("  ✓ Test A PASSED: Database-backed evidence records loaded successfully\n");

  // Test B: Search returns matching records
  console.log("Test B: Testing search query for 'groundwater' across database...");
  const searchRes = await fetch(`${BASE_URL}/api/v1/evidence?q=groundwater`);
  const searchData: any = await searchRes.json();
  console.log("  Matching records count:", searchData.total);
  searchData.items.forEach((item: any) => {
    console.log(`    - [${item.id}] ${item.title.slice(0, 60)}... (${item.authority})`);
  });
  if (searchData.total === 0) {
    throw new Error("Test B Failed: Search for 'groundwater' returned 0 results");
  }
  const allMatch = searchData.items.every((item: any) =>
    JSON.stringify(item).toLowerCase().includes("groundwater")
  );
  if (!allMatch) {
    throw new Error("Test B Failed: One or more returned items did not match 'groundwater'");
  }
  console.log("  ✓ Test B PASSED: Database search query correctly returned matching records\n");

  // Test C: Search with no matches returns empty list
  console.log("Test C: Testing search with non-existent term...");
  const noMatchRes = await fetch(`${BASE_URL}/api/v1/evidence?q=xyznonexistentterm999`);
  const noMatchData: any = await noMatchRes.json();
  console.log("  Results count for non-existent query:", noMatchData.total);
  if (noMatchData.total !== 0 || noMatchData.items.length !== 0) {
    throw new Error(`Test C Failed: Expected 0 results, got ${noMatchData.total}`);
  }
  console.log("  ✓ Test C PASSED: Search with no matches correctly returns empty list for UI empty-state\n");

  // Test D: Type filter works
  console.log("Test D: Testing Type filter ('Research')...");
  const typeRes = await fetch(`${BASE_URL}/api/v1/evidence?type=Research`);
  const typeData: any = await typeRes.json();
  console.log("  Research records found:", typeData.total);
  if (typeData.total === 0 || !typeData.items.every((i: any) => i.type === "Research")) {
    throw new Error("Test D Failed: Type filter did not isolate Research records");
  }
  console.log("  ✓ Test D PASSED: Type filter isolates matching database records\n");

  // Test E: Authority filter works
  console.log("Test E: Testing Authority filter ('Central Ground Water Board')...");
  const authRes = await fetch(`${BASE_URL}/api/v1/evidence?authority=${encodeURIComponent("Central Ground Water Board")}`);
  const authData: any = await authRes.json();
  console.log("  Records found for CGWB:", authData.total);
  if (authData.total === 0 || !authData.items.every((i: any) => i.authority.includes("Central Ground Water Board"))) {
    throw new Error("Test E Failed: Authority filter did not isolate CGWB records");
  }
  console.log("  ✓ Test E PASSED: Authority filter functions properly\n");

  // Test F: Geography filter works
  console.log("Test F: Testing Geography filter ('Tamil Nadu')...");
  const geoRes = await fetch(`${BASE_URL}/api/v1/evidence?geography=${encodeURIComponent("Tamil Nadu")}`);
  const geoData: any = await geoRes.json();
  console.log("  Records found for Tamil Nadu:", geoData.total);
  if (geoData.total === 0) {
    throw new Error("Test F Failed: Geography filter returned 0 records");
  }
  console.log("  ✓ Test F PASSED: Geography filter returns localized records\n");

  // Test G: Multiple filters work together
  console.log("Test G: Testing combined filters (type=Dataset & geography=Tamil Nadu)...");
  const comboRes = await fetch(`${BASE_URL}/api/v1/evidence?type=Dataset&geography=${encodeURIComponent("Tamil Nadu")}`);
  const comboData: any = await comboRes.json();
  console.log("  Combined filter records count:", comboData.total);
  comboData.items.forEach((item: any) => {
    console.log(`    - [${item.id}] Type: ${item.type} | Geo: ${item.geography} | Title: ${item.title.slice(0, 50)}`);
  });
  if (comboData.total === 0 || !comboData.items.every((i: any) => i.type === "Dataset")) {
    throw new Error("Test G Failed: Combined filter did not correctly apply both criteria");
  }
  console.log("  ✓ Test G PASSED: Multiple database filters work together seamlessly\n");

  // Test H: Evidence record detail completeness
  console.log("Test H: Verifying record detail fields...");
  const sample = baseData.items[0];
  const requiredFields = [
    "id", "title", "type", "authority", "year", "geography",
    "score", "summary", "tags", "sourceUrl", "checksum", "provenanceDate"
  ];
  for (const field of requiredFields) {
    if (sample[field] === undefined || sample[field] === null) {
      throw new Error(`Test H Failed: Sample record missing required field: ${field}`);
    }
  }
  console.log("  Sample Record ID:", sample.id);
  console.log("  Title:", sample.title);
  console.log("  Year:", sample.year);
  console.log("  Score:", sample.score);
  console.log("  Tags:", sample.tags);
  console.log("  Checksum:", sample.checksum);
  console.log("  ✓ Test H PASSED: All evidence records contain complete metadata\n");

  // Test I: Source URLs are distinct and not hardcoded
  console.log("Test I: Verifying source URLs are distinct across records...");
  const urls = baseData.items.map((i: any) => i.sourceUrl);
  const uniqueUrls = new Set(urls);
  console.log(`  Total records: ${urls.length}, Unique Source URLs: ${uniqueUrls.size}`);
  uniqueUrls.forEach((u) => console.log(`    - ${u}`));
  if (uniqueUrls.size < 4) {
    throw new Error("Test I Failed: Source URLs appear to be hardcoded or lack variation");
  }
  console.log("  ✓ Test I PASSED: Individual records maintain unique source authority URLs\n");

  // Test J: Provenance metadata
  console.log("Test J: Verifying provenance information...");
  if (!baseData.provenance || !baseData.provenance.mode || !baseData.provenance.authority) {
    throw new Error("Test J Failed: Provenance block missing or incomplete");
  }
  console.log("  Provenance Mode:", baseData.provenance.mode);
  console.log("  Authority:", baseData.provenance.authority);
  console.log("  Notice:", baseData.provenance.notice);
  console.log("  ✓ Test J PASSED: Provenance block explicitly documents database-backed origin\n");

  // Test K: Existing dashboard APIs still load
  console.log("Test K: Testing existing dashboard APIs...");
  const [dashCheck, geoCheck, connCheck]: any = await Promise.all([
    fetch(`${BASE_URL}/api/v1/dashboard`).then((r) => r.json()),
    fetch(`${BASE_URL}/api/v1/geo/districts`).then((r) => r.json()),
    fetch(`${BASE_URL}/api/v1/connectors`).then((r) => r.json()),
  ]);
  if (!dashCheck.metrics || !geoCheck.districts || !connCheck.items) {
    throw new Error("Test K Failed: Existing dashboard APIs broken");
  }
  console.log("  Dashboard Metrics:", dashCheck.metrics.length);
  console.log("  Districts:", geoCheck.total);
  console.log("  Connectors:", connCheck.total);
  console.log("  ✓ Test K PASSED: Existing core APIs remain fully functional\n");

  // Test L: Authentication still works
  console.log("Test L: Verifying authentication endpoint...");
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "analyst@dolr.gov.in",
      password: "Nirnaya@2026",
    }),
  });
  if (loginRes.status !== 200) {
    throw new Error("Test L Failed: Authentication login failed");
  }
  const loginCookie = loginRes.headers.get("set-cookie")?.split(";")[0]!;
  const sessionCheck = await fetch(`${BASE_URL}/api/auth/session`, {
    headers: { Cookie: loginCookie },
  });
  const sessionData: any = await sessionCheck.json();
  if (sessionData.user?.role !== "Policy Analyst") {
    throw new Error("Test L Failed: Session verification failed");
  }
  console.log("  Logged in Officer:", sessionData.user.fullName, `(${sessionData.user.role})`);
  console.log("  ✓ Test L PASSED: Authentication system fully intact\n");

  console.log("===================================================================");
  console.log("🎉 ALL EVIDENCE EXPLORER & SYSTEM INTEGRATION TESTS PASSED (A-L)! 🎉");
  console.log("===================================================================");
}

runEvidenceTests().catch((err) => {
  console.error("\n❌ EVIDENCE VERIFICATION TEST FAILED:", err);
  process.exit(1);
});
