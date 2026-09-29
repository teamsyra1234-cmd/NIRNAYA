async function testLegend() {
  const url = "https://bhuvan-vec1.nrsc.gov.in/bhuvan/wms?request=GetLegendGraphic&version=1.1.1&format=image%2Fpng&width=20&height=20&layer=basemap%3ATN_LULC";
  console.log("Testing LegendGraphic URL:", url);
  try {
    const res = await fetch(url);
    console.log("Status:", res.status, res.statusText);
    console.log("Content-Type:", res.headers.get("content-type"));
    const buf = Buffer.from(await res.arrayBuffer());
    console.log("Length:", buf.length);
  } catch (err) {
    console.error("Legend error:", err.message);
  }
}

testLegend();
