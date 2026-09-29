import fs from "fs";

async function inspectCapabilities() {
  const url = "https://bhuvan-vec1.nrsc.gov.in/bhuvan/wms?service=WMS&version=1.1.1&request=GetCapabilities";
  console.log("Fetching GetCapabilities from bhuvan-vec1...");
  try {
    const res = await fetch(url);
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Total bytes:", text.length);
    fs.writeFileSync("scratch/bhuvan-vec1-caps.xml", text);
    console.log("Saved to scratch/bhuvan-vec1-caps.xml");

    // Search for LULC or landuse
    const lulcMatches = [...text.matchAll(/<Name>([^<]*lulc[^<]*)<\/Name>/gi)].map(m => m[1]);
    console.log("LULC layer matches:", lulcMatches.slice(0, 30));

    const landMatches = [...text.matchAll(/<Name>([^<]*land[^<]*)<\/Name>/gi)].map(m => m[1]);
    console.log("Land layer matches:", landMatches.slice(0, 30));

    // Also check Title matches
    const titles = [...text.matchAll(/<Title>([^<]*Land Use[^<]*)<\/Title>/gi)].map(m => m[1]);
    console.log("Land Use titles:", titles.slice(0, 20));
  } catch (err) {
    console.error("Error:", err.message);
  }
}

inspectCapabilities();
