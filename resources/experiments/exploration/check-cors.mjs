async function checkCors() {
  const url = "https://bhuvan-vec1.nrsc.gov.in/bhuvan/wms?service=WMS&version=1.1.1&request=GetMap&layers=basemap:TN_LULC&styles=&bbox=76.2,8.0,80.4,13.6&width=600&height=600&srs=EPSG:4326&format=image/png&transparent=true";
  const res = await fetch(url);
  console.log("All response headers:");
  for (const [k, v] of res.headers.entries()) {
    console.log(`  ${k}: ${v}`);
  }
}
checkCors();
