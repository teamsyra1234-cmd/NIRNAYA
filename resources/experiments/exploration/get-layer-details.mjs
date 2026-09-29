import fs from "fs";

const text = fs.readFileSync("scratch/bhuvan-vec1-caps.xml", "utf-8");

function extractLayerXml(layerName) {
  const regex = new RegExp(`<Layer[^>]*>([\\s\\S]*?<Name>${layerName}<\\/Name>[\\s\\S]*?)<\\/Layer>`, "i");
  const match = text.match(regex);
  if (match) {
    return match[0];
  }
  return null;
}

console.log("=== basemap:TN_LULC ===");
console.log(extractLayerXml("basemap:TN_LULC"));

console.log("\n=== sisdpv2:TN_Kancheepuram_lulc_v2 ===");
console.log(extractLayerXml("sisdpv2:TN_Kancheepuram_lulc_v2"));
