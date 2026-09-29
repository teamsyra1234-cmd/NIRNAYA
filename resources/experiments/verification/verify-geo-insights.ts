import fs from "fs";
import path from "path";

async function verifyGeoInsights() {
  console.log("================================================================================");
  console.log("NIRNAYA — Geospatial Insights UI Redesign Verification Suite");
  console.log("================================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  ✓ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] ${message}`);
      failed++;
    }
  }

  const clientPath = path.resolve(process.cwd(), "app/dashboard-client.tsx");
  const cssPath = path.resolve(process.cwd(), "app/globals.css");

  const clientCode = fs.readFileSync(clientPath, "utf-8");
  const cssCode = fs.readFileSync(cssPath, "utf-8");

  console.log("--- 1. Layout & Header Selectors ---");
  assert(clientCode.includes('title="Geospatial insights"'), "Header title is 'Geospatial insights'");
  assert(
    clientCode.includes('description="Spatial context from official sources for evidence-based land governance"'),
    "Subtitle correctly set to 'Spatial context from official sources for evidence-based land governance'"
  );
  assert(clientCode.includes('id="geo-state-select"'), "State selector dropdown exists in header (id='geo-state-select')");
  assert(clientCode.includes('id="geo-district-select"'), "District selector dropdown exists in header (id='geo-district-select')");
  assert(clientCode.includes("statesList") && clientCode.includes("districtsInState"), "Dynamic state and district filtering logic implemented");

  console.log("\n--- 2. Desktop GIS Workspace Card Proportions ---");
  assert(cssCode.includes("grid-template-columns: minmax(0, 7fr) minmax(320px, 3fr)"), "Map and Inspector set to ~70% / 30% grid columns");
  assert(cssCode.includes(".map-canvas-card") && cssCode.includes("height: 620px"), ".map-canvas-card fixed height 620px");
  assert(cssCode.includes(".map-inspector-card") && cssCode.includes("height: 620px"), ".map-inspector-card fixed height 620px matching map card");
  assert(clientCode.includes('className="map-layout"'), "map-layout wrapper used");
  assert(clientCode.includes('className="map-canvas-card"'), "map-canvas-card used for left GIS map");
  assert(clientCode.includes('className="map-inspector-card"'), "map-inspector-card used for right District Inspector");

  console.log("\n--- 3. Official Bhuvan WMS & Map Layers Card ---");
  assert(clientCode.includes('id="bhuvan-wms-raster"'), "Bhuvan WMS raster image element intact (id='bhuvan-wms-raster')");
  assert(clientCode.includes('id="bhuvan-attribution"'), "Bhuvan attribution pill intact (id='bhuvan-attribution')");
  assert(clientCode.includes("Source: Bhuvan / NRSC / ISRO, Government of India"), "Attribution text matches official government source");
  assert(clientCode.includes("LIVE WMS"), "LIVE WMS badge displayed");
  assert(clientCode.includes('className="map-layers-card"'), "Compact 'Map layers' card placed inside map");
  assert(clientCode.includes('id="btn-toggle-nirnaya-risk"'), "NIRNAYA Risk Indicators toggle intact");
  assert(clientCode.includes('id="btn-toggle-bhuvan-lulc"'), "Official Bhuvan LULC toggle intact");
  assert(clientCode.includes('id="bhuvan-bottom-infobar"'), "Bottom GIS information bar intact (id='bhuvan-bottom-infobar')");
  assert(clientCode.includes("Official Bhuvan WMS Layer:"), "Bottom bar displays official layer metadata");
  assert(clientCode.includes("CRS:"), "Bottom bar displays CRS EPSG:4326");
  assert(clientCode.includes("Live from NRSC/ISRO"), "Bottom bar confirms live NRSC/ISRO feed");
  assert(clientCode.includes('id="btn-bhuvan-source-details"'), "View source details interactive button present");

  console.log("\n--- 4. Compact Vertically Grouped Map Controls ---");
  assert(clientCode.includes('id="btn-map-zoom-in"'), "Zoom in button intact (id='btn-map-zoom-in')");
  assert(clientCode.includes('id="btn-map-zoom-out"'), "Zoom out button intact (id='btn-map-zoom-out')");
  assert(clientCode.includes('id="btn-map-reset"'), "Reset view button intact (id='btn-map-reset')");
  assert(clientCode.includes('id="btn-map-toggle-layers-panel"'), "Map layers panel toggle button intact");
  assert(clientCode.includes('id="btn-map-toggle-districts"'), "District shading toggle button intact");
  assert(clientCode.includes('id="btn-map-toggle-labels"'), "District labels toggle button intact");
  assert(clientCode.includes('id="btn-map-open-settings"'), "Layer configuration settings button intact");

  console.log("\n--- 5. District Inspector Tabs & Content ---");
  assert(clientCode.includes('className="inspector-tabs"'), "Inspector tabs bar rendered");
  assert(clientCode.includes('inspectorTab === "overview"'), "Overview tab implemented");
  assert(clientCode.includes('inspectorTab === "landuse"'), "Land use tab implemented");
  assert(clientCode.includes('inspectorTab === "risks"'), "Risk indicators tab implemented");
  assert(clientCode.includes('inspectorTab === "evidence"'), "Evidence tab implemented");

  console.log("\n--- 6. Land Use / Land Cover Honest Presentation ---");
  assert(clientCode.includes("Land Use / Land Cover (Bhuvan)"), "Land Use / Land Cover (Bhuvan) card header rendered");
  assert(clientCode.includes("Built-up Area"), "Built-up Area class rendered");
  assert(clientCode.includes("Agriculture / Crop"), "Agriculture / Crop class rendered");
  assert(clientCode.includes("Plantation"), "Plantation class rendered");
  assert(clientCode.includes("Forest / Scrub"), "Forest / Scrub class rendered");
  assert(clientCode.includes("Water Bodies"), "Water Bodies class rendered");
  assert(clientCode.includes("Wasteland"), "Wasteland class rendered");
  assert(clientCode.includes("Others"), "Others class rendered");
  assert(clientCode.includes("Mapped in WMS"), "Classes without stored stats honestly report 'Mapped in WMS' (no fake stats)");

  console.log("\n--- 7. Risk Indicators & Footer Actions ---");
  assert(clientCode.includes("Groundwater stress"), "Groundwater stress indicator rendered");
  assert(clientCode.includes("Built-up expansion"), "Built-up expansion indicator rendered");
  assert(clientCode.includes("Livelihood sensitivity"), "Livelihood sensitivity indicator rendered");
  assert(clientCode.includes("Data completeness"), "Data completeness indicator rendered");
  assert(clientCode.includes("Land dispute intensity"), "Land dispute intensity indicator rendered");
  assert(clientCode.includes("Datasets Combined:"), "Datasets Combined count displayed in footer");
  assert(clientCode.includes("Linked Evidence"), "Linked Evidence count displayed in footer");
  assert(clientCode.includes("Key Data Sources:"), "Key Data Sources displayed in footer");
  assert(clientCode.includes("Provenance:"), "Provenance notice displayed in footer");
  assert(clientCode.includes('id="btn-run-scenario-studio"'), "Run Scenario Studio button present with id='btn-run-scenario-studio'");

  console.log("\n================================================================================");
  console.log(`VERIFICATION SUMMARY: ${passed}/${passed + failed} checks passed (${failed} failures)`);
  console.log("================================================================================");

  if (failed > 0) process.exit(1);
}

verifyGeoInsights().catch((err) => {
  console.error("Verification script failed:", err);
  process.exit(1);
});
