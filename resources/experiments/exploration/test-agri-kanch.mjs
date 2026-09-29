async function runAgri() {
  const q = 'agriculture Kancheepuram';
  const url = `https://www.data.gov.in/backend/dmspublic/v1/catalogs?query=${encodeURIComponent(q)}&offset=0&limit=100`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const data = await res.json();
  const rows = data.data?.rows || [];
  console.log(`Fetched ${rows.length} rows for "${q}"`);
  rows.slice(0, 20).forEach((r, idx) => {
    const t = r.title?.[0] || '';
    const jur = (r['field_asset_jurisdiction:name'] || []).join(', ');
    if (t.toLowerCase().includes('kanch') || jur.toLowerCase().includes('kanch')) {
      console.log(`[${idx}] KANCH MATCH: "${t}" | Jur: "${jur}"`);
    }
  });
}
runAgri();
