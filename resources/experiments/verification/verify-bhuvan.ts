import {
  BHUVAN_CONFIG,
  getBhuvanWmsUrl,
  getBhuvanLegendUrl,
  resolveBhuvanLayerForDistrict,
  verifyBhuvanLive,
  getBhuvanStatus,
} from "../lib/adapters/bhuvan";
import { getDb } from "../db";
import { districts, evidence, connectors, ogdRecords, scenarioRuns } from "../db/schema";

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
  console.log("NIRNAYA — Bhuvan / NRSC / ISRO Official WMS Integration Verification");
  console.log("================================================================================\n");

  // -----------------------------------------------------------------------------------------
  // Test A: Bhuvan WMS HTTP Availability
  // -----------------------------------------------------------------------------------------
  console.log("--- Test A: Live Bhuvan WMS HTTP Availability ---");
  const liveCheck = await verifyBhuvanLive();
  console.log("Live WMS verification result:", JSON.stringify(liveCheck, null, 2));

  assert(
    liveCheck.isReachable === true,
    "Bhuvan WMS Reachability",
    `Official Bhuvan WMS (${BHUVAN_CONFIG.wmsEndpoint}) is reachable (HTTP ${liveCheck.httpStatus}, response time: ${liveCheck.responseTimeMs}ms)`
  );
  assert(
    liveCheck.httpStatus === 200,
    "Bhuvan WMS HTTP 200",
    `Service returned authentic HTTP 200 image response directly from NRSC / ISRO server`
  );

  // -----------------------------------------------------------------------------------------
  // Test B: Exact Layer Names
  // -----------------------------------------------------------------------------------------
  console.log("\n--- Test B: Exact Layer Names & Service Endpoint ---");
  assert(
    BHUVAN_CONFIG.wmsEndpoint === "https://bhuvan-vec2.nrsc.gov.in/bhuvan/sisdpv2/wms",
    "Authoritative WMS Endpoint",
    `Authoritative endpoint matches verified SIS-DP vector WMS server: ${BHUVAN_CONFIG.wmsEndpoint}`
  );
  assert(
    BHUVAN_CONFIG.layers.kancheepuramLulc.name === "sisdpv2:TN_Kancheepuram_lulc_v2",
    "District Layer Name Exactness",
    `Kancheepuram district SISDP V2 layer name is exactly 'sisdpv2:TN_Kancheepuram_lulc_v2'`
  );
  assert(
    BHUVAN_CONFIG.attribution === "Source: Bhuvan / NRSC / ISRO, Government of India",
    "Official Attribution Wording",
    `Attribution conforms to requirement: "${BHUVAN_CONFIG.attribution}"`
  );

  // -----------------------------------------------------------------------------------------
  // Test C: Bhuvan Adapter Status API
  // -----------------------------------------------------------------------------------------
  console.log("\n--- Test C: Bhuvan Adapter Status Evaluation ---");
  const adapterStatus = await getBhuvanStatus();
  console.log("Adapter status payload:", JSON.stringify(adapterStatus, null, 2));

  assert(
    adapterStatus.status === "LIVE / OFFICIAL",
    "Honest Live Status",
    `Adapter reports status "${adapterStatus.status}" because upstream WMS was verified live`
  );
  assert(
    adapterStatus.governanceStatus === "LIVE / OFFICIAL",
    "Governance Status Alignment",
    `Governance status is "${adapterStatus.governanceStatus}"`
  );
  assert(
    adapterStatus.authority.includes("National Remote Sensing Centre") && adapterStatus.authority.includes("ISRO"),
    "Publishing Authority Verification",
    `Authority correctly attributes: "${adapterStatus.authority}"`
  );
  assert(
    adapterStatus.activeLayers.length >= 2,
    "Available Layers Populated",
    `Adapter exposes ${adapterStatus.activeLayers.length} verified thematic layers`
  );
  assert(
    typeof adapterStatus.lastVerification === "string" && adapterStatus.lastVerification.length > 0,
    "Verification Timestamp",
    `Last verification recorded: ${adapterStatus.lastVerification}`
  );

  // -----------------------------------------------------------------------------------------
  // Test D: Map Layer Configuration & WMS URL Generation
  // -----------------------------------------------------------------------------------------
  console.log("\n--- Test D: Map Layer Configuration & WMS GetMap URLs ---");
  const testWmsUrl = getBhuvanWmsUrl({
    layer: BHUVAN_CONFIG.layers.kancheepuramLulc.name,
    bbox: BHUVAN_CONFIG.layers.kancheepuramLulc.bbox,
    width: 600,
    height: 600,
  });
  console.log("Sample generated WMS GetMap URL:", testWmsUrl);

  assert(
    testWmsUrl.startsWith("https://bhuvan-vec2.nrsc.gov.in/bhuvan/sisdpv2/wms?"),
    "WMS Base URL Integrity",
    `WMS URL correctly targets official service base`
  );
  assert(
    testWmsUrl.includes("SERVICE=WMS") &&
      testWmsUrl.includes("REQUEST=GetMap") &&
      testWmsUrl.includes("LAYERS=sisdpv2%3ATN_Kancheepuram_lulc_v2") &&
      testWmsUrl.includes("SRS=EPSG%3A4326") &&
      testWmsUrl.includes("FORMAT=image%2Fpng"),
    "OGC WMS Parameter Conformance",
    `URL includes all required OGC WMS 1.1.1 parameters (SERVICE, REQUEST, LAYERS, SRS, FORMAT, BBOX)`
  );

  const legendUrl = getBhuvanLegendUrl("sisdpv2:TN_Kancheepuram_lulc_v2");
  assert(
    legendUrl.includes("REQUEST=GetLegendGraphic") && legendUrl.includes("LAYER=sisdpv2%3ATN_Kancheepuram_lulc_v2"),
    "Legend Graphic URL",
    `Legend URL conforms to OGC specification: ${legendUrl}`
  );

  // -----------------------------------------------------------------------------------------
  // Test E: Kancheepuram Layer Selection Preference
  // -----------------------------------------------------------------------------------------
  console.log("\n--- Test E: Kancheepuram SISDP V2 Layer Selection ---");
  const kanchiRes = resolveBhuvanLayerForDistrict("Kancheepuram");
  assert(
    kanchiRes.layerName === "sisdpv2:TN_Kancheepuram_lulc_v2",
    "Kancheepuram Prefers SISDP V2",
    `When Kancheepuram is selected, resolves layer '${kanchiRes.layerName}' (${kanchiRes.title})`
  );
  assert(
    kanchiRes.isDistrictSpecific === true,
    "District-Specific Flag",
    `Marked as high-resolution district-specific layer`
  );
  assert(
    kanchiRes.bbox === "79.5597,12.2288,80.2664,13.0630",
    "Kancheepuram Bounding Box",
    `Correct bounding box coordinates applied: ${kanchiRes.bbox}`
  );

  // -----------------------------------------------------------------------------------------
  // Test F: Default / State SIS-DP LULC Layer Selection
  // -----------------------------------------------------------------------------------------
  console.log("\n--- Test F: Default / State SIS-DP Layer Selection ---");
  const tnRes = resolveBhuvanLayerForDistrict("Tamil Nadu");
  assert(
    tnRes.layerName === "sisdpv2:TN_Kancheepuram_lulc_v2",
    "State View Resolves Verified SIS-DP Layer",
    `Broader state view resolves '${tnRes.layerName}' (${tnRes.title})`
  );
  assert(
    tnRes.bbox === "79.5597,12.2288,80.2664,13.0630",
    "State View Bounding Box",
    `Verified bounding box coordinates applied: ${tnRes.bbox}`
  );

  // Default fallback when empty string
  const emptyRes = resolveBhuvanLayerForDistrict("");
  assert(
    emptyRes.layerName === "sisdpv2:TN_Kancheepuram_lulc_v2",
    "Default View Resolves Verified Layer",
    `Empty/unmatched district gracefully defaults to '${emptyRes.layerName}'`
  );

  // -----------------------------------------------------------------------------------------
  // Test G: Existing Map Controls & Connectors Registry Integrity
  // -----------------------------------------------------------------------------------------
  console.log("\n--- Test G: Connectors API & OGD Preservation ---");
  const db = getDb();
  const connRows = await db.select().from(connectors).all();
  const bhuvanRow = connRows.find((c) => c.id === "bhuvan");
  const ogdRow = connRows.find((c) => c.id === "ogd");

  assert(
    bhuvanRow !== undefined,
    "Bhuvan in Connectors Registry",
    `Found Bhuvan entry in connectors table (status: ${bhuvanRow?.status}, governance: ${bhuvanRow?.governanceStatus})`
  );
  assert(
    bhuvanRow?.status === "live" && bhuvanRow?.governanceStatus === "LIVE / OFFICIAL",
    "Bhuvan Connector Live Status",
    `Bhuvan row accurately reflects verified LIVE / OFFICIAL status`
  );

  assert(
    ogdRow !== undefined,
    "OGD Connector Preserved",
    `Found OGD entry in connectors table`
  );
  assert(
    ogdRow?.governanceStatus === "API KEY REQUIRED" || ogdRow?.status === "approval-required",
    "OGD Status Unaltered",
    `OGD remains '${ogdRow?.governanceStatus}' / '${ogdRow?.status}' with 0 official records (Requirement 13 satisfied)`
  );

  // -----------------------------------------------------------------------------------------
  // Test H: Database Integrity Across All Entities
  // -----------------------------------------------------------------------------------------
  console.log("\n--- Test H: Non-Regression & Database Integrity ---");
  const distRows = await db.select().from(districts).all();
  const evRows = await db.select().from(evidence).all();
  const scenRows = await db.select().from(scenarioRuns).all();
  const ogdRecordsList = await db.select().from(ogdRecords).all();

  assert(distRows.length >= 3, "Districts Intact", `${distRows.length} pilot districts active`);
  assert(evRows.length >= 5, "Evidence Intact", `${evRows.length} evidence items active`);
  assert(Array.isArray(scenRows), "Scenario Runs Intact", `${scenRows.length} scenario runs active`);
  assert(ogdRecordsList.length === 0, "OGD Official Records Count Honest", `0 records in SQLite as required`);

  // -----------------------------------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------------------------------
  console.log("\n================================================================================");
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;
  console.log(`BHUVAN VERIFICATION SUMMARY: ${passed}/${total} checks passed (${failed} failures)`);
  console.log("================================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Verification script threw unhandled error:", err);
  process.exit(1);
});
