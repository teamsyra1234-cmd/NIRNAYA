async function check() {
  const res = await fetch('https://www.data.gov.in/backend/dmspublic/v1/catalogs?query=agriculture+Tamil+Nadu&offset=0&limit=50', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const data = await res.json();
  const rows = data.data?.rows || [];
  console.log(`Fetched ${rows.length} rows for agriculture Tamil Nadu:`);
  rows.forEach((r, idx) => {
    const t = (r.title?.[0] || '').toLowerCase();
    const b = (r['body:value']?.[0] || '').toLowerCase();
    const jur = ((r['field_asset_jurisdiction:name'] || []).join(' ')).toLowerCase();
    const isTN = t.includes('tamil nadu') || jur.includes('tamil nadu') || b.includes('tamil nadu');
    const isAgri = t.includes('agri') || b.includes('agri') || t.includes('crop') || b.includes('crop') || t.includes('land') || b.includes('land') || t.includes('farm') || b.includes('farm');
    if (isTN && isAgri) {
      console.log(`  [MATCH BOTH] Row ${idx}: ${r.title?.[0]} | Jur: ${jur}`);
    } else if (isTN) {
      console.log(`  [TN ONLY] Row ${idx}: ${r.title?.[0].slice(0, 50)} | Jur: ${jur}`);
    }
  });
}
check();
