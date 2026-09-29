import fs from "fs";

const text = fs.readFileSync("scratch/bhuvan-vec1-caps.xml", "utf-8");

// Search for Tamil Nadu LULC
const tnMatches = [...text.matchAll(/<Layer[^>]*>([\s\S]*?)<\/Layer>/gi)];

const layers = [];
for (const match of tnMatches) {
  const content = match[1];
  const nameMatch = content.match(/<Name>([^<]+)<\/Name>/i);
  const titleMatch = content.match(/<Title>([^<]+)<\/Title>/i);
  const srsMatch = content.match(/<SRS>([^<]+)<\/SRS>/i);
  const bboxMatch = content.match(/<BoundingBox[^>]+>/i);

  if (nameMatch) {
    const name = nameMatch[1];
    const title = titleMatch ? titleMatch[1] : "";
    if (name.toLowerCase().includes("lulc") || title.toLowerCase().includes("lulc")) {
      layers.push({
        name,
        title,
        srs: srsMatch ? srsMatch[1] : "EPSG:4326",
        bbox: bboxMatch ? bboxMatch[0] : "",
      });
    }
  }
}

console.log(`Found ${layers.length} LULC layers in bhuvan-vec1.`);

// Filter for national or Tamil Nadu (TN)
const tnLayers = layers.filter(l => l.name.includes("TN") || l.title.includes("Tamil") || l.name.includes("India") || l.name.includes("india") || l.name.includes("basemap"));
console.log("\nTamil Nadu / National / Basemap LULC layers:");
console.log(JSON.stringify(tnLayers.slice(0, 20), null, 2));

// Filter general or interesting LULC layers
console.log("\nSample LULC layers across categories:");
console.log(JSON.stringify(layers.slice(0, 15), null, 2));
