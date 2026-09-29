import { OGD_CONFIG, computeChecksum, normalizeOgdRecord, getOgdStatus, syncOgdData } from "../lib/adapters/ogd";
import { getDb } from "../db";
import { ogdRecords, connectors, districts, evidence } from "../db/schema";

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, name: string, details: string) {
  results.push({
    name,
    passed: condition,
    details: condition ? details : `FAILED: ${details}`,
  });
  const symbol = condition ? "PASS" : "FAIL";
  console.log(`[${symbol}] ${name}: ${details}`);
}

async function runTests() {
  console.log("================================================================================");
  console.log("NIRNAYA — OGD Platform India (data.gov.in) Official Integration Verification");
  console.log("================================================================================\n");

  // -----------------------------------------------------------------------------------------
  // Test 1: Official Endpoint & Metadata Configuration
  // -----------------------------------------------------------------------------------------
  console.log("--- Test 1: Configuration & Metadata Verification ---");
  const expectedEndpoint = "https://api.data.gov.in/resource/6c05cd1b-ed59-40c2-bc31-e314f39c6971";
  assert(
    OGD_CONFIG.apiEndpoint === expectedEndpoint,
    "Official API Endpoint",
    `Configured endpoint matches Government of India NWIC rainfall resource (${OGD_CONFIG.apiEndpoint})`
  );
  assert(
    OGD_CONFIG.resourceId === "6c05cd1b-ed59-40c2-bc31-e314f39c6971",
    "Resource UUID Integrity",
    `Resource UUID is correctly configured as ${OGD_CONFIG.resourceId}`
  );
  assert(
    OGD_CONFIG.catalogId === "a6007b2f-eed3-4a68-a321-d2d563d52bb2",
    "Catalog UUID Integrity",
    `Catalog UUID is correctly configured as ${OGD_CONFIG.catalogId}`
  );
  assert(
    OGD_CONFIG.publisher.includes("Ministry of Jal Shakti") && OGD_CONFIG.publisher.includes("NWIC"),
    "Publishing Authority",
    `Authority correctly attributes Ministry of Jal Shakti / NWIC: "${OGD_CONFIG.publisher}"`
  );

  // -----------------------------------------------------------------------------------------
  // Test 2: Live Network Verification with data.gov.in (Unauthenticated Request)
  // -----------------------------------------------------------------------------------------
  console.log("\n--- Test 2: Live Network Handshake with api.data.gov.in ---");
  try {
    const liveEndpoint = `${OGD_CONFIG.apiEndpoint}?format=json`;
    console.log("Sending live unauthenticated request to:", liveEndpoint);
    const liveResponse = await fetch(liveEndpoint, {
      headers: { Accept: "application/json" },
    });
    const liveData = (await liveResponse.json()) as any;
    console.log("Actual live response from api.data.gov.in:", JSON.stringify(liveData));

    const isGenuineAuthMissing =
      liveData && (liveData.error === "Authorization field missing" || liveData.message?.includes("Authorization"));
    assert(
      isGenuineAuthMissing,
      "Live data.gov.in Auth Handshake",
      `Genuine live response received from api.data.gov.in: error="${liveData.error || liveData.message}". Confirms authentic upstream connection.`
    );
  } catch (err: any) {
    assert(false, "Live data.gov.in Auth Handshake", `Network error contacting data.gov.in: ${err.message}`);
  }

  // -----------------------------------------------------------------------------------------
  // Test 3: Cryptographic Provenance & SHA-256 Checksum Calculation
  // -----------------------------------------------------------------------------------------
  console.log("\n--- Test 3: Cryptographic SHA-256 Provenance ---");
  const sampleData = {
    district: "Kancheepuram",
    state: "Tamil Nadu",
    date: "2024-06-01",
    rainfall_mm: 45.2,
  };
  const hash1 = computeChecksum(sampleData);
  const hash2 = computeChecksum({ ...sampleData });
  const hash3 = computeChecksum({ ...sampleData, rainfall_mm: 45.3 });

  assert(
    hash1.startsWith("sha256:") && hash1.length === 71,
    "SHA-256 Hash Format",
    `Valid SHA-256 digest format with sha256 prefix generated: ${hash1}`
  );
  assert(
    hash1 === hash2,
    "Deterministic Hash Generation",
    `Identical payloads produce identical SHA-256 checksums`
  );
  assert(
    hash1 !== hash3,
    "Tamper Sensitivity",
    `Single numerical variation (45.2 -> 45.3) produces completely different checksum (${hash3.slice(0, 24)}...)`
  );

  // -----------------------------------------------------------------------------------------
  // Test 4: Record Normalization & Schema Conformance
  // -----------------------------------------------------------------------------------------
  console.log("\n--- Test 4: Record Normalization ---");
  const rawGovRecord = {
    state_name: "TAMIL NADU",
    district_name: "KANCHEEPURAM",
    rainfall_mm: "32.4",
    normal_rainfall_mm: "28.1",
    departure_percentage: "+15.3",
    data_date: "2024-05-15",
  };
  const normalized = normalizeOgdRecord(rawGovRecord, 0);

  assert(
    normalized.state === "TAMIL NADU" && normalized.district === "KANCHEEPURAM",
    "Field Mapping & Geography",
    `Geography extracted as ${normalized.state} / ${normalized.district}`
  );
  assert(
    normalized.isOfficial === true,
    "Official Attribution Flag",
    `isOfficial set to true for government-published records`
  );
  assert(
    normalized.authority.includes("Ministry of Jal Shakti"),
    "Authority Attribution",
    `Normalized authority preserved as: ${normalized.authority}`
  );
  assert(
    normalized.checksum.startsWith("sha256:") && normalized.checksum.length === 71,
    "Record-Level Checksum",
    `Record checksum attached: ${normalized.checksum.slice(0, 24)}...`
  );

  // -----------------------------------------------------------------------------------------
  // Test 5: Status & Governance Reporting
  // -----------------------------------------------------------------------------------------
  console.log("\n--- Test 5: Honest Governance Status ---");
  const statusBefore = await getOgdStatus();
  console.log("Current OGD status from adapter:", JSON.stringify(statusBefore, null, 2));

  assert(
    typeof statusBefore.recordsCount === "number",
    "Record Count Operational",
    `Records count reported: ${statusBefore.recordsCount}`
  );
  assert(
    statusBefore.officialDataset.catalogId === OGD_CONFIG.catalogId,
    "Catalog UUID in Status",
    `Catalog ID exposed in status API: ${statusBefore.officialDataset.catalogId}`
  );
  assert(
    statusBefore.connector &&
      (statusBefore.connector.governanceStatus === "API KEY REQUIRED" ||
        statusBefore.connector.governanceStatus === "Adapter ready" ||
        statusBefore.connector.governanceStatus === "Approval required" ||
        statusBefore.connector.governanceStatus === "LIVE / OFFICIAL"),
    "Honest Governance Label",
    `Current governance status is "${statusBefore.connector?.governanceStatus}" (never fake "Connected")`
  );

  // -----------------------------------------------------------------------------------------
  // Test 6: Safe Public Execution (Missing API Key Handling)
  // -----------------------------------------------------------------------------------------
  console.log("\n--- Test 6: Safe Public Sync Handling (No Key) ---");
  const unauthSync = await syncOgdData("");
  console.log("Unauthenticated sync result:", JSON.stringify(unauthSync, null, 2));

  assert(
    unauthSync.success === false,
    "Safe Failure on Missing Credentials",
    `Sync safely reports success: false without crashing or corrupting data`
  );
  assert(
    unauthSync.status === "APPROVAL_REQUIRED",
    "Honest Status Code",
    `Status code reports: ${unauthSync.status}`
  );
  assert(
    unauthSync.message.toLowerCase().includes("api key") || unauthSync.message.includes("Authorization"),
    "Honest Error Message",
    `Message reports: "${unauthSync.message}"`
  );

  // -----------------------------------------------------------------------------------------
  // Test 7: Non-Regression & Database Integrity
  // -----------------------------------------------------------------------------------------
  console.log("\n--- Test 7: Database Integrity & Non-Regression ---");
  const db = getDb();
  const districtRows = await db.select().from(districts).all();
  const evidenceRows = await db.select().from(evidence).all();
  const connectorRows = await db.select().from(connectors).all();
  const ogdRows = await db.select().from(ogdRecords).all();

  assert(
    districtRows.length >= 3,
    "District Records Preserved",
    `Found ${districtRows.length} pilot districts in database (districts table intact)`
  );
  assert(
    evidenceRows.length >= 5,
    "Evidence Records Preserved",
    `Found ${evidenceRows.length} evidence records in database (evidence table intact)`
  );
  assert(
    connectorRows.length >= 5,
    "Connector Records Preserved",
    `Found ${connectorRows.length} connectors in registry (connectors table intact)`
  );
  assert(
    Array.isArray(ogdRows),
    "OGD Records Table Operable",
    `ogd_records table verified in SQLite (${ogdRows.length} records currently stored)`
  );

  // -----------------------------------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------------------------------
  console.log("\n================================================================================");
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;
  console.log(`VERIFICATION SUMMARY: ${passed}/${total} checks passed (${failed} failures)`);
  console.log("================================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Verification script threw unhandled error:", err);
  process.exit(1);
});
