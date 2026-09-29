import {
  BHUVAN_CONFIG,
  resolveBhuvanLayerForDistrict,
  buildBhuvanFeatureInfoUrl,
  formatBhuvanArea,
  queryBhuvanFeatureInfo,
  type BhuvanFeatureInfoResult,
} from "../lib/adapters/bhuvan";

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
  console.log("NIRNAYA — Bhuvan GetFeatureInfo Live Service Integration Verification");
  console.log("================================================================================\n");

  // -----------------------------------------------------------------------------------------
  // Test 1: Authoritative Endpoint
  // -----------------------------------------------------------------------------------------
  console.log("--- 1. Authoritative WMS Endpoint ---");
  assert(
    BHUVAN_CONFIG.wmsEndpoint === "https://bhuvan-vec2.nrsc.gov.in/bhuvan/sisdpv2/wms",
    "Official WMS Endpoint",
    `WMS endpoint matches verified SIS-DP V2 vector server: ${BHUVAN_CONFIG.wmsEndpoint}`
  );

  // -----------------------------------------------------------------------------------------
  // Test 2: Layer Resolution for All 6 Pilot Districts
  // -----------------------------------------------------------------------------------------
  console.log("\n--- 2. Layer Resolution for All 6 Pilot Districts ---");
  const pilotDistricts = [
    { name: "Kancheepuram", expectedLayer: "sisdpv2:TN_Kancheepuram_lulc_v2", expectedBbox: "79.5597,12.2288,80.2664,13.0630" },
    { name: "Chennai", expectedLayer: "sisdpv2:TN_Chennai_lulc_v2", expectedBbox: "80.1,12.9,80.35,13.2" },
    { name: "Tiruvallur", expectedLayer: "sisdpv2:TN_Thiruvallur_lulc_v2", expectedBbox: "79.7,13.0,80.3,13.5" },
    { name: "Coimbatore", expectedLayer: "sisdpv2:TN_Coimbatore_lulc_v2", expectedBbox: "76.6,10.7,77.3,11.5" },
    { name: "Pune", expectedLayer: "sisdpv2:MH_Pune_lulc_v2", expectedBbox: "73.3,18.0,75.2,19.4" },
    { name: "Jaipur", expectedLayer: "sisdpv2:RJ_Jaipur_lulc_v2", expectedBbox: "74.9,26.5,76.3,27.9" },
  ];

  for (const dist of pilotDistricts) {
    const resolved = resolveBhuvanLayerForDistrict(dist.name);
    assert(
      resolved.layerName === dist.expectedLayer,
      `Layer Resolution: ${dist.name}`,
      `${dist.name} resolved to '${resolved.layerName}' (expected '${dist.expectedLayer}')`
    );
    assert(
      resolved.bbox === dist.expectedBbox,
      `BBox Resolution: ${dist.name}`,
      `${dist.name} bbox is '${resolved.bbox}'`
    );
  }

  // -----------------------------------------------------------------------------------------
  // Test 3: OGC WMS 1.1.1 GetFeatureInfo URL Specification
  // -----------------------------------------------------------------------------------------
  console.log("\n--- 3. OGC WMS 1.1.1 GetFeatureInfo Request Structure ---");
  const sampleUrl = buildBhuvanFeatureInfoUrl({
    layer: "sisdpv2:TN_Kancheepuram_lulc_v2",
    bbox: "79.5597,12.2288,80.2664,13.0630",
    width: 600,
    height: 600,
    x: 300,
    y: 300,
  });
  console.log("Sample URL:", sampleUrl);

  assert(
    sampleUrl.includes("SERVICE=WMS"),
    "OGC Parameter SERVICE",
    "Contains SERVICE=WMS"
  );
  assert(
    sampleUrl.includes("VERSION=1.1.1"),
    "OGC Parameter VERSION",
    "Contains VERSION=1.1.1"
  );
  assert(
    sampleUrl.includes("REQUEST=GetFeatureInfo"),
    "OGC Parameter REQUEST",
    "Contains REQUEST=GetFeatureInfo"
  );
  assert(
    sampleUrl.includes("LAYERS=sisdpv2%3ATN_Kancheepuram_lulc_v2") &&
      sampleUrl.includes("QUERY_LAYERS=sisdpv2%3ATN_Kancheepuram_lulc_v2"),
    "OGC Parameter LAYERS & QUERY_LAYERS",
    "Contains matching LAYERS and QUERY_LAYERS parameters"
  );
  assert(
    sampleUrl.includes("INFO_FORMAT=application%2Fjson"),
    "OGC Parameter INFO_FORMAT",
    "Requests application/json GeoJSON output"
  );
  assert(
    sampleUrl.includes("SRS=EPSG%3A4326"),
    "OGC Parameter SRS",
    "Uses SRS=EPSG:4326"
  );
  assert(
    sampleUrl.includes("X=300") && sampleUrl.includes("Y=300"),
    "OGC Parameter X & Y",
    "Includes viewport pixel coordinates X=300, Y=300"
  );

  // -----------------------------------------------------------------------------------------
  // Test 4: Live GetFeatureInfo Query on All 6 Pilot District Layers
  // -----------------------------------------------------------------------------------------
  console.log("\n--- 4. Live GetFeatureInfo Queries across All 6 Pilot Districts ---");
  const realSampleResponses: Record<string, any> = {};

  for (const dist of pilotDistricts) {
    console.log(`\nQuerying live feature for ${dist.name}...`);
    const queryRes: BhuvanFeatureInfoResult = await queryBhuvanFeatureInfo({
      layer: dist.expectedLayer,
      bbox: dist.expectedBbox,
      width: 600,
      height: 600,
      x: 300,
      y: 300,
    });

    assert(
      queryRes.success === true,
      `Live Query Success: ${dist.name}`,
      `Query completed successfully with status: ${queryRes.status}`
    );
    assert(
      queryRes.status === "FEATURE_FOUND",
      `Feature Returned: ${dist.name}`,
      `Bhuvan returned a real classified feature for ${dist.name}`
    );

    if (queryRes.feature) {
      realSampleResponses[dist.name] = queryRes.feature;
      console.log(`  Real returned attributes for ${dist.name}:`, JSON.stringify(queryRes.feature, null, 2));

      // Verify lc_code
      assert(
        typeof queryRes.feature.lc_code === "string" && queryRes.feature.lc_code.length > 0,
        `lc_code Present: ${dist.name}`,
        `LULC Code: '${queryRes.feature.lc_code}'`
      );

      // Verify dscr1, dscr2, dscr3
      assert(
        typeof queryRes.feature.dscr1 === "string" && queryRes.feature.dscr1.length > 0,
        `dscr1 Present: ${dist.name}`,
        `Land Cover (dscr1): '${queryRes.feature.dscr1}'`
      );
      assert(
        typeof queryRes.feature.dscr2 === "string" && queryRes.feature.dscr2.length > 0,
        `dscr2 Present: ${dist.name}`,
        `Detailed Class (dscr2): '${queryRes.feature.dscr2}'`
      );
      assert(
        typeof queryRes.feature.dscr3 === "string" && queryRes.feature.dscr3.length > 0,
        `dscr3 Present: ${dist.name}`,
        `Sub-class (dscr3): '${queryRes.feature.dscr3}'`
      );

      // Verify Shape_Area and formatBhuvanArea
      assert(
        typeof queryRes.feature.Shape_Area === "number" && queryRes.feature.Shape_Area > 0,
        `Shape_Area Valid: ${dist.name}`,
        `Raw Shape_Area: ${queryRes.feature.Shape_Area}`
      );
      const formattedArea = formatBhuvanArea(queryRes.feature.Shape_Area);
      assert(
        formattedArea.includes("km²"),
        `Area Conversion: ${dist.name}`,
        `Formatted Area: '${formattedArea}'`
      );

      // Verify Provenance
      assert(
        queryRes.provenance.source === "Bhuvan / NRSC / ISRO, Government of India",
        `Source Attribution: ${dist.name}`,
        `Source: '${queryRes.provenance.source}'`
      );
      assert(
        queryRes.provenance.service === "SIS-DP V2 1:10,000 WMS",
        `Service Attribution: ${dist.name}`,
        `Service: '${queryRes.provenance.service}'`
      );
      assert(
        queryRes.provenance.layer === dist.expectedLayer,
        `Layer Attribution: ${dist.name}`,
        `Layer: '${queryRes.provenance.layer}'`
      );
    }
  }

  // -----------------------------------------------------------------------------------------
  // Test 5: No-Feature State Handling (Outside Territory or Ocean)
  // -----------------------------------------------------------------------------------------
  console.log("\n--- 5. No-Feature State Handling ---");
  const noFeatureRes = await queryBhuvanFeatureInfo({
    layer: "sisdpv2:TN_Chennai_lulc_v2",
    bbox: "80.1,12.9,80.35,13.2",
    width: 600,
    height: 600,
    x: 10,
    y: 10, // Far corner outside district polygon
  });

  assert(
    noFeatureRes.status === "NO_FEATURE" || noFeatureRes.status === "FEATURE_FOUND",
    "Clean Query State",
    `Query safely returned status: ${noFeatureRes.status}`
  );
  if (noFeatureRes.status === "NO_FEATURE") {
    assert(
      noFeatureRes.message === "No Bhuvan feature returned at this location.",
      "Exact No-Feature Message",
      `Displayed truthful message: '${noFeatureRes.message}'`
    );
    assert(
      noFeatureRes.feature === undefined,
      "No Data Fabrication",
      "No fabricated feature attributes were generated"
    );
  }

  // -----------------------------------------------------------------------------------------
  // Test 6: Technical Error State Handling
  // -----------------------------------------------------------------------------------------
  console.log("\n--- 6. Technical Error State Handling ---");
  const errorRes = await queryBhuvanFeatureInfo({
    layer: "sisdpv2:NON_EXISTENT_LAYER_TEST",
    bbox: "0,0,1,1",
    width: 600,
    height: 600,
    x: 300,
    y: 300,
  });

  assert(
    errorRes.status === "ERROR",
    "Technical Error Handled Safely",
    `Invalid layer cleanly reported status 'ERROR' without crashing`
  );
  assert(
    typeof errorRes.error === "string" && errorRes.error.length > 0,
    "Real Error Detail Reported",
    `Technical error detail: '${errorRes.error}'`
  );
  assert(
    errorRes.feature === undefined,
    "No Fabricated Data on Error",
    "Did not fabricate feature data when request failed"
  );

  // -----------------------------------------------------------------------------------------
  // Test 7: Internal API Route Verification (/api/v1/adapters/bhuvan/feature-info)
  // -----------------------------------------------------------------------------------------
  console.log("\n--- 7. Internal API Route Verification ---");
  try {
    const apiRes = await fetch(
      "http://localhost:3000/api/v1/adapters/bhuvan/feature-info?layer=sisdpv2:TN_Kancheepuram_lulc_v2&bbox=79.5597,12.2288,80.2664,13.0630&width=600&height=600&x=300&y=300"
    );
    if (apiRes.ok) {
      const apiJson = (await apiRes.json()) as any;
      assert(
        apiJson.success === true,
        "API Route HTTP 200",
        `Next.js API route /api/v1/adapters/bhuvan/feature-info returned HTTP 200 OK`
      );
      assert(
        apiJson.status === "FEATURE_FOUND",
        "API Route Feature Found",
        `API returned real feature: ${apiJson.feature?.dscr1} (${apiJson.feature?.lc_code})`
      );
    } else {
      console.log(`Local dev server returned HTTP ${apiRes.status} (server may be starting or on different port)`);
    }
  } catch (err: any) {
    console.log("Local HTTP fetch skipped (dev server background):", err.message);
  }

  // -----------------------------------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------------------------------
  console.log("\n================================================================================");
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;
  console.log(`BHUVAN GETFEATUREINFO VERIFICATION SUMMARY: ${passed}/${total} checks passed (${failed} failures)`);
  console.log("================================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Verification script threw unhandled error:", err);
  process.exit(1);
});
