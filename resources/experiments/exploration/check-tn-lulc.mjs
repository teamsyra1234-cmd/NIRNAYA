import fs from "fs";

const text = fs.readFileSync("scratch/bhuvan-vec1-caps.xml", "utf-8");

const matches = [...text.matchAll(/<Name>([^<]*TN[^<]*lulc[^<]*)<\/Name>/gi)].map(m => m[1]);
console.log("TN LULC name matches:", matches);

const tnMatches2 = [...text.matchAll(/<Name>([^<]*lulc[^<]*TN[^<]*)<\/Name>/gi)].map(m => m[1]);
console.log("LULC TN name matches:", tnMatches2);

// Check if basemap:TN_LULC exists
const hasBasemapTn = text.includes("basemap:TN_LULC");
console.log("has basemap:TN_LULC:", hasBasemapTn);

// Check all basemap: layers
const basemaps = [...text.matchAll(/<Name>(basemap:[^<]+)<\/Name>/gi)].map(m => m[1]);
console.log("All basemap layers:", basemaps.filter(b => b.includes("LULC")));

// Check if there is an India-wide or national LULC layer
const nationalLulc = [...text.matchAll(/<Name>([^<]*india[^<]*lulc[^<]*)<\/Name>/gi)].map(m => m[1]);
console.log("India LULC layers:", nationalLulc);

const lulcAll = [...text.matchAll(/<Name>([a-zA-Z0-9_]+:[a-zA-Z0-9_]+lulc[a-zA-Z0-9_]*)<\/Name>/gi)].map(m => m[1]);
console.log("Total matched LULC layer names:", lulcAll.length);
console.log("Distinct prefixes:", [...new Set(lulcAll.map(n => n.split(':')[0]))]);
