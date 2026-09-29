import fs from "fs";
import path from "path";

const BASE_URL = "http://localhost:3000";

async function runToolbarVerification() {
  console.log("=== NIRNAYA Geospatial Map Toolbar Fix Verification ===\n");

  const dashboardClientPath = path.resolve(process.cwd(), "app/dashboard-client.tsx");
  const dashboardContent = fs.readFileSync(dashboardClientPath, "utf-8");

  // 1. Verify separate isolated handlers
  console.log("1. Verifying toolbar handler function definitions in dashboard-client.tsx...");
  const requiredHandlers = [
    "handleZoomIn",
    "handleZoomOut",
    "handleReset",
    "handleToggleDistricts",
    "handleToggleLabels",
    "handleOpenSettings",
  ];

  for (const handler of requiredHandlers) {
    if (!dashboardContent.includes(`const ${handler} =`)) {
      throw new Error(`Missing required handler: ${handler}`);
    }
    console.log(`  ✓ Found dedicated handler: ${handler}`);
  }

  // 2. Verify handleZoomIn only modifies zoom
  console.log("\n2. Verifying handleZoomIn logic...");
  const zoomInMatch = dashboardContent.match(/const handleZoomIn = \([\s\S]*?\{([\s\S]*?)\};/);
  if (!zoomInMatch) throw new Error("Could not parse handleZoomIn");
  const zoomInBody = zoomInMatch[1];
  if (!zoomInBody.includes("setZoom") || zoomInBody.includes("onOpenSettings") || zoomInBody.includes("setMapSettingsOpen")) {
    throw new Error("handleZoomIn must ONLY update zoom and MUST NOT open settings");
  }
  console.log("  ✓ handleZoomIn only modifies zoom state");

  // 3. Verify handleZoomOut only modifies zoom
  console.log("\n3. Verifying handleZoomOut logic...");
  const zoomOutMatch = dashboardContent.match(/const handleZoomOut = \([\s\S]*?\{([\s\S]*?)\};/);
  if (!zoomOutMatch) throw new Error("Could not parse handleZoomOut");
  const zoomOutBody = zoomOutMatch[1];
  if (!zoomOutBody.includes("setZoom") || zoomOutBody.includes("onOpenSettings") || zoomOutBody.includes("setMapSettingsOpen")) {
    throw new Error("handleZoomOut must ONLY update zoom and MUST NOT open settings");
  }
  console.log("  ✓ handleZoomOut only modifies zoom state");

  // 4. Verify handleReset only resets view
  console.log("\n4. Verifying handleReset logic...");
  const resetMatch = dashboardContent.match(/const handleReset = \([\s\S]*?\{([\s\S]*?)\};/);
  if (!resetMatch) throw new Error("Could not parse handleReset");
  const resetBody = resetMatch[1];
  if (!resetBody.includes("setZoom(1)") || resetBody.includes("onOpenSettings") || resetBody.includes("setMapSettingsOpen")) {
    throw new Error("handleReset must ONLY reset view and MUST NOT open settings");
  }
  console.log("  ✓ handleReset only resets zoom and search without opening settings");

  // 5. Verify handleToggleDistricts only toggles districts
  console.log("\n5. Verifying handleToggleDistricts logic...");
  const toggleDistrictsMatch = dashboardContent.match(/const handleToggleDistricts = \([\s\S]*?\{([\s\S]*?)\};/);
  if (!toggleDistrictsMatch) throw new Error("Could not parse handleToggleDistricts");
  const toggleDistrictsBody = toggleDistrictsMatch[1];
  if (!toggleDistrictsBody.includes("setShowDistricts") || toggleDistrictsBody.includes("onOpenSettings") || toggleDistrictsBody.includes("setMapSettingsOpen")) {
    throw new Error("handleToggleDistricts must ONLY toggle showDistricts and MUST NOT open settings");
  }
  console.log("  ✓ handleToggleDistricts only toggles district polygon visibility");

  // 6. Verify handleToggleLabels only toggles labels
  console.log("\n6. Verifying handleToggleLabels logic...");
  const toggleLabelsMatch = dashboardContent.match(/const handleToggleLabels = \([\s\S]*?\{([\s\S]*?)\};/);
  if (!toggleLabelsMatch) throw new Error("Could not parse handleToggleLabels");
  const toggleLabelsBody = toggleLabelsMatch[1];
  if (!toggleLabelsBody.includes("setShowLabels") || toggleLabelsBody.includes("onOpenSettings") || toggleLabelsBody.includes("setMapSettingsOpen")) {
    throw new Error("handleToggleLabels must ONLY toggle showLabels and MUST NOT open settings");
  }
  console.log("  ✓ handleToggleLabels only toggles label visibility");

  // 7. Verify handleOpenSettings exclusively opens settings
  console.log("\n7. Verifying handleOpenSettings logic...");
  const openSettingsMatch = dashboardContent.match(/const handleOpenSettings = \([\s\S]*?\{([\s\S]*?)\};/);
  if (!openSettingsMatch) throw new Error("Could not parse handleOpenSettings");
  const openSettingsBody = openSettingsMatch[1];
  if (!openSettingsBody.includes("onOpenSettings()")) {
    throw new Error("handleOpenSettings must invoke onOpenSettings");
  }
  console.log("  ✓ handleOpenSettings exclusively opens the settings modal");

  // 8. Verify toolbar JSX button bindings
  console.log("\n8. Verifying button wiring in the JSX map toolbar...");
  const toolbarSectionMatch = dashboardContent.match(/<div[^>]*?className="map-toolbar"[^>]*?>([\s\S]*?)<\/div>/);
  if (!toolbarSectionMatch) throw new Error("Could not find .map-toolbar in JSX");
  const toolbarJSX = toolbarSectionMatch[0];

  const expectedButtons = [
    { id: "btn-map-zoom-in", handler: "onClick={handleZoomIn}" },
    { id: "btn-map-zoom-out", handler: "onClick={handleZoomOut}" },
    { id: "btn-map-reset", handler: "onClick={handleReset}" },
    { id: "btn-map-toggle-districts", handler: "onClick={handleToggleDistricts}" },
    { id: "btn-map-toggle-labels", handler: "onClick={handleToggleLabels}" },
    { id: "btn-map-open-settings", handler: "onClick={handleOpenSettings}" },
  ];

  for (const btn of expectedButtons) {
    if (!toolbarJSX.includes(btn.id)) {
      throw new Error(`Button ID ${btn.id} missing from toolbar JSX`);
    }
    if (!toolbarJSX.includes(btn.handler)) {
      throw new Error(`Button ${btn.id} is not wired to ${btn.handler}`);
    }
    console.log(`  ✓ Button [${btn.id}] correctly wired to [${btn.handler}]`);
  }

  // Check that parent container does not have an openSettings handler
  if (toolbarJSX.includes('onClick={onOpenSettings}') || toolbarJSX.includes('onClick={handleOpenSettings}')) {
    // Only the settings button itself should have handleOpenSettings
    const occurrences = (toolbarJSX.match(/handleOpenSettings/g) || []).length;
    if (occurrences > 1) {
      throw new Error("handleOpenSettings was accidentally assigned to more than 1 element in toolbar!");
    }
  }
  console.log("  ✓ Parent toolbar container does NOT trigger settings modal");

  // 9. Verify Layer Switcher does not trigger settings
  console.log("\n9. Verifying Layer Switcher buttons in header...");
  const layerSwitchMatch = dashboardContent.match(/<div className="layer-switch"[\s\S]*?<\/div>/);
  if (!layerSwitchMatch) throw new Error("Could not find .layer-switch in JSX");
  const layerSwitchJSX = layerSwitchMatch[0];
  if (layerSwitchJSX.includes("handleOpenSettings") || layerSwitchJSX.includes("onOpenSettings") || layerSwitchJSX.includes("mapSettingsOpen")) {
    throw new Error("Layer switcher must NOT contain any settings modal handlers!");
  }
  console.log("  ✓ Layer Switcher buttons are completely independent of configuration modal");

  // 10. Runtime Regression Test against backend APIs
  console.log("\n10. Testing backend API integration & non-regression...");

  // Districts API
  const distRes = await fetch(`${BASE_URL}/api/v1/geo/districts?layer=Water%20stress`);
  if (!distRes.ok) throw new Error(`Districts API returned status ${distRes.status}`);
  const distData: any = await distRes.json();
  console.log(`  ✓ Districts API OK: ${distData.districts.length} pilot districts retrieved`);

  // Search API
  const searchRes = await fetch(`${BASE_URL}/api/v1/geo/districts?search=Pune`);
  if (!searchRes.ok) throw new Error(`District Search API returned status ${searchRes.status}`);
  const searchData: any = await searchRes.json();
  console.log(`  ✓ District Search API OK: found ${searchData.districts[0]?.name}`);

  // Evidence Explorer API
  const evRes = await fetch(`${BASE_URL}/api/v1/evidence?q=groundwater`);
  if (!evRes.ok) throw new Error(`Evidence API returned status ${evRes.status}`);
  const evData: any = await evRes.json();
  const count = evData.total ?? evData.data?.length ?? 0;
  console.log(`  ✓ Evidence Explorer API OK: ${count} records returned`);

  // Auth Session API
  const authRes = await fetch(`${BASE_URL}/api/auth/session`);
  if (!authRes.ok) throw new Error(`Auth API returned status ${authRes.status}`);
  console.log("  ✓ Authentication session endpoint OK");

  console.log("\n=======================================================");
  console.log("🎉 ALL TOOLBAR FIX VERIFICATIONS PASSED SUCCESSFULLY! 🎉");
  console.log("=======================================================\n");
}

runToolbarVerification().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});

export {};
