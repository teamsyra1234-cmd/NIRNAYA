async function check() {
  const res = await fetch('https://www.data.gov.in/backend/dmspublic/v1/catalogs?query=groundwater+Tamil+Nadu&offset=0&limit=50', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const data = await res.json();
  const rows = data.data?.rows || [];
  console.log(`Fetched ${rows.length} rows for groundwater Tamil Nadu:`);
  rows.forEach((r, idx) => {
    const t = (r.title?.[0] || '').toLowerCase();
    const b = (r['body:value']?.[0] || '').toLowerCase();
    const jur = ((r['field_asset_jurisdiction:name'] || []).join(' ')).toLowerCase();
    const isTN = t.includes('tamil nadu') || jur.includes('tamil nadu') || b.includes('tamil nadu');
    const isWater = t.includes('water') || b.includes('water') || t.includes('ground') || b.includes('ground');
    if (isTN && isWater) {
      console.log(`  [MATCH BOTH] Row ${idx}: ${r.title?.[0]} | Jur: ${jur}`);
    } else if (isWater) {
      console.log(`  [WATER ONLY] Row ${idx}: ${r.title?.[0]} | Jur: ${jur}`);
    }
  });
}
check();
