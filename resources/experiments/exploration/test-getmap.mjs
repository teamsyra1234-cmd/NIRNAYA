import fs from "fs";

async function testGetMap() {
  // Let's test basemap:TN_LULC GetMap
  // Tamil Nadu Bounding Box roughly: 76.2, 8.0, 80.4, 13.6
  const params = new URLSearchParams({
    service: "WMS",
    version: "1.1.1",
    request: "GetMap",
    layers: "basemap:TN_LULC",
    styles: "",
    bbox: "76.2,8.0,80.4,13.6",
    width: "600",
    height: "600",
    srs: "EPSG:4326",
    format: "image/png",
    transparent: "true"
  });

  const url = `https://bhuvan-vec1.nrsc.gov.in/bhuvan/wms?${params.toString()}`;
  console.log("Testing WMS GetMap:", url);

  try {
    const res = await fetch(url);
    console.log("GetMap HTTP Status:", res.status, res.statusText);
    console.log("Content-Type:", res.headers.get("content-type"));
    const buffer = Buffer.from(await res.arrayBuffer());
    console.log("Received bytes:", buffer.length);

    if (res.headers.get("content-type")?.includes("image")) {
      fs.writeFileSync("scratch/tn_lulc_test.png", buffer);
      console.log("Saved test map image to scratch/tn_lulc_test.png (SUCCESS!)");
    } else {
      console.log("Response text:", buffer.toString("utf-8").slice(0, 500));
    }
  } catch (err) {
    console.error("GetMap error:", err.message);
  }

  // Also test Kancheepuram district LULC: sisdpv2:TN_Kancheepuram_lulc_v2
  // Kancheepuram bbox roughly 79.5, 12.4, 80.3, 13.1
  const kanchiParams = new URLSearchParams({
    service: "WMS",
    version: "1.1.1",
    request: "GetMap",
    layers: "sisdpv2:TN_Kancheepuram_lulc_v2",
    styles: "",
    bbox: "79.5,12.4,80.3,13.1",
    width: "600",
    height: "600",
    srs: "EPSG:4326",
    format: "image/png",
    transparent: "true"
  });

  const kanchiUrl = `https://bhuvan-vec1.nrsc.gov.in/bhuvan/wms?${kanchiParams.toString()}`;
  console.log("\nTesting Kancheepuram WMS GetMap:", kanchiUrl);
  try {
    const res2 = await fetch(kanchiUrl);
    console.log("Kancheepuram Status:", res2.status, res2.statusText);
    console.log("Content-Type:", res2.headers.get("content-type"));
    const buffer2 = Buffer.from(await res2.arrayBuffer());
    console.log("Received bytes:", buffer2.length);

    if (res2.headers.get("content-type")?.includes("image")) {
      fs.writeFileSync("scratch/kancheepuram_lulc_test.png", buffer2);
      console.log("Saved Kancheepuram LULC image to scratch/kancheepuram_lulc_test.png (SUCCESS!)");
    } else {
      console.log("Response text:", buffer2.toString("utf-8").slice(0, 500));
    }
  } catch (err) {
    console.error("Kanchi error:", err.message);
  }
}

testGetMap();
