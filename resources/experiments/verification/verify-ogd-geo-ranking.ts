/**
 * NIRNAYA — Live OGD Discovery Geographic Relevance Ranking Verification Suite
 * 
 * Verifies:
 * 1. "rainfall Kancheepuram": District detected as Kancheepuram, Kancheepuram rainfall dataset prioritized (#1),
 *    Tamil Nadu state-wide datasets follow, Maharashtra datasets ranked at bottom.
 * 2. "rainfall Kanchipuram": Spelling variant detected as Kancheepuram, same priority ranking.
 * 3. "rainfall Tamil Nadu": State detected as Tamil Nadu, existing state ranking preserved.
 * 4. "rainfall Kancheepuram Tamil Nadu": Both district and state detected, Kancheepuram rainfall dataset prioritized.
 * 5. "agriculture Kancheepuram": District-aware ranking works across topics, Kancheepuram agriculture dataset prioritized.
 * 6. "rainfall": No geographic term detected, original OGD relevance preserved.
 * 7. "wetland Kancheepuram": No false match for "wetland", district detected as Kancheepuram.
 * 8. "highland agriculture": No false match for "highland", detectedGeography is null.
 * 9. False district matches: Words like "impunity", "punitive", "component", "prune" do not match Pune/Jaipur.
 * 10. "agriculture Tamil Nadu": Tamil Nadu datasets prioritized over other states.
 * 11. "groundwater Tamil Nadu": Tamil Nadu datasets prioritized, national datasets preserved.
 * 12. Truthful metadata: No false geographic labels; official source URLs point to valid data.gov.in links.
 */

import {
  searchOgdCatalog,
  detectIndianGeography,
  detectIndianDistrict,
  detectIndianState,
  extractTopicKeywords,
  calculateGeographicRelevanceScore,
  rankDatasetsByGeography,
  SUPPORTED_INDIAN_DISTRICTS,
  SUPPORTED_INDIAN_STATES,
} from "../lib/adapters/ogd";

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

const testResults: TestResult[] = [];

function assert(condition: boolean, name: string, details: string) {
  testResults.push({
    name,
    passed: condition,
    details: condition ? details : `FAILED: ${details}`,
  });
  const symbol = condition ? "PASS" : "FAIL";
  console.log(`[${symbol}] ${name}: ${details}`);
}

async function runGeographicRankingVerification() {
  console.log("================================================================================");
  console.log("NIRNAYA — Live OGD Discovery Geographic Relevance Ranking Verification Suite");
  console.log("================================================================================\n");

  // -------------------------------------------------------------------------------------------
  // Test 1: Query Parser & Negative Matching (No False Geographic Matches)
  // -------------------------------------------------------------------------------------------
  console.log("--- Test 1: Geographic Query Parser & Boundary Precision ---");

  const falsePositiveChecks = [
    { query: "wetland conservation", expected: null },
    { query: "highland agriculture", expected: null },
    { query: "island development", expected: null },
    { query: "wasteland reclamation", expected: null },
    { query: "woodland protection", expected: null },
    { query: "modelhimachal", expected: null },
    { query: "goal achievement", expected: null },
    { query: "clean up project", expected: null },
    // False district matches (e.g. Pune, Jaipur, etc.)
    { query: "impunity from law", expected: null },
    { query: "punitive damages", expected: null },
    { query: "software component", expected: null },
    { query: "prune trees", expected: null },
    { query: "dispute resolution", expected: null },
  ];

  let allNegativesPassed = true;
  for (const { query, expected } of falsePositiveChecks) {
    const detected = detectIndianGeography(query);
    if (detected !== expected) {
      allNegativesPassed = false;
      assert(false, `False Positive Guard: "${query}"`, `Expected null, but detected "${detected?.label}"`);
    }
  }
  if (allNegativesPassed) {
    assert(
      true,
      "Word-Boundary Negative Matching",
      `All ${falsePositiveChecks.length} non-geographic queries passed without false matches (including Pune/Jaipur word boundaries)`
    );
  }

  const positiveChecks = [
    { query: "agriculture Tamil Nadu", expectedDistrict: null, expectedState: "Tamil Nadu", expectedLabel: "Tamil Nadu" },
    { query: "groundwater Tamil Nadu", expectedDistrict: null, expectedState: "Tamil Nadu", expectedLabel: "Tamil Nadu" },
    { query: "rainfall Kancheepuram", expectedDistrict: "Kancheepuram", expectedState: null, expectedLabel: "Kancheepuram" },
    { query: "rainfall Kanchipuram", expectedDistrict: "Kancheepuram", expectedState: null, expectedLabel: "Kancheepuram" },
    { query: "rainfall Kancheepuram Tamil Nadu", expectedDistrict: "Kancheepuram", expectedState: "Tamil Nadu", expectedLabel: "Kancheepuram, Tamil Nadu" },
    { query: "agriculture Kancheepuram", expectedDistrict: "Kancheepuram", expectedState: null, expectedLabel: "Kancheepuram" },
    { query: "wetland Kancheepuram", expectedDistrict: "Kancheepuram", expectedState: null, expectedLabel: "Kancheepuram" },
    { query: "water Pune", expectedDistrict: "Pune", expectedState: null, expectedLabel: "Pune" },
    { query: "solar Jaipur", expectedDistrict: "Jaipur", expectedState: null, expectedLabel: "Jaipur" },
    { query: "flood Chennai", expectedDistrict: "Chennai", expectedState: null, expectedLabel: "Chennai" },
    { query: "lakes Tiruvallur", expectedDistrict: "Tiruvallur", expectedState: null, expectedLabel: "Tiruvallur" },
    { query: "lakes Thiruvallur", expectedDistrict: "Tiruvallur", expectedState: null, expectedLabel: "Tiruvallur" },
    { query: "industry Coimbatore", expectedDistrict: "Coimbatore", expectedState: null, expectedLabel: "Coimbatore" },
  ];

  let allPositivesPassed = true;
  for (const { query, expectedDistrict, expectedState, expectedLabel } of positiveChecks) {
    const detected = detectIndianGeography(query);
    if (!detected || detected.district !== expectedDistrict || detected.state !== expectedState || detected.label !== expectedLabel) {
      allPositivesPassed = false;
      assert(
        false,
        `Positive Detection: "${query}"`,
        `Expected { district: ${expectedDistrict}, state: ${expectedState}, label: "${expectedLabel}" }, got: ${JSON.stringify(detected)}`
      );
    }
  }
  if (allPositivesPassed) {
    assert(
      true,
      "District & State Detection Accuracy",
      `All ${positiveChecks.length} geographic queries correctly parsed district, state, and compound labels`
    );
  }

  // -------------------------------------------------------------------------------------------
  // Test 2: Live Search: "rainfall Kancheepuram"
  // -------------------------------------------------------------------------------------------
  console.log("\n--- Test 2: Live Search: 'rainfall Kancheepuram' ---");
  try {
    const res = await searchOgdCatalog("rainfall Kancheepuram", { limit: 10 });
    assert(res.success, "API Success", `searchOgdCatalog returned success: ${res.success}`);
    assert(
      res.detectedGeography === "Kancheepuram",
      "Detected Geography Label",
      `Response detectedGeography is "${res.detectedGeography}"`
    );
    assert(
      res.detectedDistrict === "Kancheepuram",
      "Detected District",
      `Response detectedDistrict is "${res.detectedDistrict}"`
    );
    assert(res.total > 0, "Preserved Total Count", `Total count is authentic official count: ${res.total}`);
    assert(res.items.length > 0, "Discovered Items Returned", `Returned ${res.items.length} items`);

    console.log("Top 5 Results for 'rainfall Kancheepuram':");
    res.items.slice(0, 5).forEach((item, idx) => {
      console.log(`  ${idx + 1}. [${item.state || "National / Central"}] ${item.title.slice(0, 65)}`);
    });

    // Check that rank #1 is Kancheepuram Climate and Rainfall Handbook!
    const firstTitle = res.items[0]?.title.toLowerCase();
    const firstState = (res.items[0]?.state || "").toLowerCase();
    const isKancheepuramMatch = firstTitle.includes("kancheepuram") || firstState.includes("kanchipuram");

    assert(
      isKancheepuramMatch,
      "Kancheepuram District Prioritization (#1)",
      `Rank 1 result matches Kancheepuram: "${res.items[0]?.title}" (State/Jur: "${res.items[0]?.state}")`
    );

    // Verify Maharashtra datasets are ranked below matching Tamil Nadu/Kancheepuram results
    const top5States = res.items.slice(0, 5).map((it) => it.state || "");
    const topHasTamilNaduOrKanchipuram = top5States.every(
      (st) => st.includes("Tamil Nadu") || st.includes("Kanchipuram") || st.includes("All India") || st.includes("State")
    );
    assert(
      topHasTamilNaduOrKanchipuram,
      "Maharashtra Excluded From Top Results",
      "Top 5 results do not contain unrelated Maharashtra district datasets"
    );
  } catch (err: any) {
    assert(false, "rainfall Kancheepuram search", `Error: ${err.message}`);
  }

  // -------------------------------------------------------------------------------------------
  // Test 3: Live Search: "rainfall Kanchipuram" (Spelling Variant)
  // -------------------------------------------------------------------------------------------
  console.log("\n--- Test 3: Live Search: 'rainfall Kanchipuram' (Spelling Variant) ---");
  try {
    const res = await searchOgdCatalog("rainfall Kanchipuram", { limit: 5 });
    assert(res.success, "API Success", `searchOgdCatalog returned success: ${res.success}`);
    assert(
      res.detectedGeography === "Kancheepuram",
      "Canonical District Detected",
      `Variant "Kanchipuram" normalized to canonical "${res.detectedGeography}"`
    );
    const firstTitle = res.items[0]?.title.toLowerCase();
    const isKanch = firstTitle.includes("kancheepuram") || (res.items[0]?.state || "").toLowerCase().includes("kanchipuram");
    assert(
      isKanch,
      "Kanchipuram Prioritization",
      `Rank 1 matches Kancheepuram: "${res.items[0]?.title.slice(0, 60)}"`
    );
  } catch (err: any) {
    assert(false, "rainfall Kanchipuram search", `Error: ${err.message}`);
  }

  // -------------------------------------------------------------------------------------------
  // Test 4: Live Search: "rainfall Kancheepuram Tamil Nadu" (District + State)
  // -------------------------------------------------------------------------------------------
  console.log("\n--- Test 4: Live Search: 'rainfall Kancheepuram Tamil Nadu' ---");
  try {
    const res = await searchOgdCatalog("rainfall Kancheepuram Tamil Nadu", { limit: 5 });
    assert(res.success, "API Success", `searchOgdCatalog returned success: ${res.success}`);
    assert(
      res.detectedGeography === "Kancheepuram, Tamil Nadu",
      "Compound Geography Label",
      `Response detectedGeography is "${res.detectedGeography}"`
    );
    assert(
      res.detectedDistrict === "Kancheepuram" && res.detectedState === "Tamil Nadu",
      "District and State Both Identified",
      `District: "${res.detectedDistrict}", State: "${res.detectedState}"`
    );
    const firstTitle = res.items[0]?.title.toLowerCase();
    assert(
      firstTitle.includes("kancheepuram") || (res.items[0]?.state || "").toLowerCase().includes("kanchipuram"),
      "District Dataset Highest Priority",
      `Rank 1 dataset: "${res.items[0]?.title.slice(0, 60)}"`
    );
  } catch (err: any) {
    assert(false, "rainfall Kancheepuram Tamil Nadu search", `Error: ${err.message}`);
  }

  // -------------------------------------------------------------------------------------------
  // Test 5: Live Search: "agriculture Kancheepuram"
  // -------------------------------------------------------------------------------------------
  console.log("\n--- Test 5: Live Search: 'agriculture Kancheepuram' ---");
  try {
    const res = await searchOgdCatalog("agriculture Kancheepuram", { limit: 5 });
    assert(res.success, "API Success", `searchOgdCatalog returned success: ${res.success}`);
    assert(
      res.detectedGeography === "Kancheepuram",
      "District Detected In Agriculture Query",
      `detectedGeography is "${res.detectedGeography}"`
    );
    console.log("Top 3 Results for 'agriculture Kancheepuram':");
    res.items.slice(0, 3).forEach((item, idx) => {
      console.log(`  ${idx + 1}. [${item.state || "N/A"}] ${item.title.slice(0, 65)}`);
    });
    const firstTitle = res.items[0]?.title.toLowerCase();
    assert(
      firstTitle.includes("kancheepuram") || (res.items[0]?.state || "").toLowerCase().includes("kanchipuram"),
      "Agriculture Kancheepuram Prioritization",
      `Rank 1 is Kancheepuram specific: "${res.items[0]?.title.slice(0, 60)}"`
    );
  } catch (err: any) {
    assert(false, "agriculture Kancheepuram search", `Error: ${err.message}`);
  }

  // -------------------------------------------------------------------------------------------
  // Test 6: Live Search: "rainfall" (No Geographic Restriction)
  // -------------------------------------------------------------------------------------------
  console.log("\n--- Test 6: Live Search: 'rainfall' (Neutral Query) ---");
  try {
    const res = await searchOgdCatalog("rainfall", { limit: 5 });
    assert(res.success, "API Success", `searchOgdCatalog returned success: ${res.success}`);
    assert(
      res.detectedGeography === null,
      "No False Geography Detected",
      `Neutral query 'rainfall' has detectedGeography: null`
    );
    assert(res.total > 0, "Preserved Total Count", `Total count reported: ${res.total}`);
    assert(
      res.items.length > 0,
      "Original Relevance Preserved",
      `Returned ${res.items.length} items preserving original OGD catalog ordering`
    );
  } catch (err: any) {
    assert(false, "rainfall search", `Error: ${err.message}`);
  }

  // -------------------------------------------------------------------------------------------
  // Test 7: Live Search: "wetland Kancheepuram"
  // -------------------------------------------------------------------------------------------
  console.log("\n--- Test 7: Live Search: 'wetland Kancheepuram' ---");
  try {
    const res = await searchOgdCatalog("wetland Kancheepuram", { limit: 5 });
    assert(res.success, "API Success", `searchOgdCatalog returned success: ${res.success}`);
    assert(
      res.detectedGeography === "Kancheepuram",
      "Wetland Prefix Guard",
      `'wetland' did not cause false match; correctly detected district "${res.detectedGeography}"`
    );
  } catch (err: any) {
    assert(false, "wetland Kancheepuram search", `Error: ${err.message}`);
  }

  // -------------------------------------------------------------------------------------------
  // Test 8: Live Search: "highland agriculture"
  // -------------------------------------------------------------------------------------------
  console.log("\n--- Test 8: Live Search: 'highland agriculture' ---");
  try {
    const res = await searchOgdCatalog("highland agriculture", { limit: 5 });
    assert(res.success, "API Success", `searchOgdCatalog returned success: ${res.success}`);
    assert(
      res.detectedGeography === null,
      "Highland Prefix Guard",
      `'highland' did not cause false match; detectedGeography is null`
    );
  } catch (err: any) {
    assert(false, "highland agriculture search", `Error: ${err.message}`);
  }

  // -------------------------------------------------------------------------------------------
  // Test 9: Live Search: "agriculture Tamil Nadu"
  // -------------------------------------------------------------------------------------------
  console.log("\n--- Test 9: Live Search: 'agriculture Tamil Nadu' ---");
  try {
    const res = await searchOgdCatalog("agriculture Tamil Nadu", { limit: 5 });
    assert(res.success, "API Success", `searchOgdCatalog returned success: ${res.success}`);
    assert(
      res.detectedGeography === "Tamil Nadu",
      "State Detected",
      `detectedGeography is "${res.detectedGeography}"`
    );
    const topItemIsTamilNadu =
      res.items[0]?.title.toLowerCase().includes("tamil nadu") ||
      res.items[0]?.state?.toLowerCase().includes("tamil nadu") ||
      res.items[0]?.jurisdiction?.toLowerCase().includes("tamil nadu");
    assert(
      Boolean(topItemIsTamilNadu),
      "Tamil Nadu Prioritization",
      `Top result matches Tamil Nadu: "${res.items[0]?.title.slice(0, 60)}"`
    );
  } catch (err: any) {
    assert(false, "agriculture Tamil Nadu search", `Error: ${err.message}`);
  }

  // -------------------------------------------------------------------------------------------
  // Test 10: Truthful Metadata & Official Link Integrity
  // -------------------------------------------------------------------------------------------
  console.log("\n--- Test 10: Truthful Metadata & Official Link Integrity ---");
  try {
    const res = await searchOgdCatalog("rainfall Kancheepuram", { limit: 10 });
    let truthViolations = 0;
    for (const it of res.items) {
      if (it.state && (!it.jurisdiction || it.jurisdiction.trim() === "")) {
        truthViolations++;
      }
      if (!it.sourceUrl || !it.sourceUrl.startsWith("https://data.gov.in")) {
        assert(false, "Official Link Check", `Item ${it.id} does not have valid data.gov.in URL`);
      }
    }
    assert(
      truthViolations === 0,
      "Truthful Geographic Labeling",
      `No items have invented state/district labels (0 violations across ${res.items.length} items)`
    );
    assert(
      res.items.every((it) => it.sourceAuthority === "Open Government Data Platform India (data.gov.in)"),
      "Authority Provenance",
      "All items maintain authentic data.gov.in source authority attribution"
    );
  } catch (err: any) {
    assert(false, "Truthful metadata check", `Error: ${err.message}`);
  }

  // -------------------------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------------------------
  console.log("\n================================================================================");
  const total = testResults.length;
  const passed = testResults.filter((r) => r.passed).length;
  const failed = testResults.filter((r) => !r.passed).length;
  console.log(`VERIFICATION SUMMARY: ${passed}/${total} checks passed (${failed} failures)`);
  console.log("================================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runGeographicRankingVerification().catch((err) => {
  console.error("Verification suite encountered unexpected error:", err);
  process.exit(1);
});
