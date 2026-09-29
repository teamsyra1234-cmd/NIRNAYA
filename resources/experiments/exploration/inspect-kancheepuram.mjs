async function test() {
  const q = 'rainfall Kancheepuram';
  const url = `https://www.data.gov.in/backend/dmspublic/v1/catalogs?query=${encodeURIComponent(q)}&offset=0&limit=50`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const data = await res.json();
  console.log(`Total: ${data.total}, Rows: ${data.data?.rows?.length}`);
  data.data?.rows?.forEach((r, idx) => {
    const title = r.title?.[0] || '';
    const jur = (r['field_asset_jurisdiction:name'] || []).join(', ');
    const desc = (r['body:value']?.[0] || '').slice(0, 100);
    console.log(`[${idx}] Jur: "${jur}" | Title: "${title}"`);
  });
}
test();
