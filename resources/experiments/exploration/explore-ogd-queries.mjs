async function run() {
  for (const q of ['Tamil Nadu agriculture', 'agriculture Tamil Nadu', 'groundwater Tamil Nadu', 'Tamil Nadu']) {
    const res = await fetch('https://www.data.gov.in/backend/dmspublic/v1/catalogs?query=' + encodeURIComponent(q) + '&offset=0&limit=10', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const data = await res.json();
    console.log(`=== Query: "${q}" Total: ${data.total} ===`);
    data.data?.rows?.slice(0, 5).forEach((r, i) => {
      console.log(`  ${i}: ${r.title?.[0]} | ${r['field_asset_jurisdiction:name']}`);
    });
  }
}
run();
