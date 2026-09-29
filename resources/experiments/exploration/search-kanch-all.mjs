async function searchAll() {
  const q = 'rainfall Kancheepuram';
  for (let offset = 0; offset <= 150; offset += 50) {
    const url = `https://www.data.gov.in/backend/dmspublic/v1/catalogs?query=${encodeURIComponent(q)}&offset=${offset}&limit=50`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const data = await res.json();
    data.data?.rows?.forEach((r, idx) => {
      const title = r.title?.[0] || '';
      const jur = (r['field_asset_jurisdiction:name'] || []).join(', ');
      const desc = (r['body:value']?.[0] || '').slice(0, 100);
      const allText = `${title} ${jur} ${desc}`.toLowerCase();
      if (allText.includes('kanch')) {
        console.log(`[Offset ${offset} + ${idx}] KANCH MATCH -> Jur: "${jur}" | Title: "${title}"`);
      }
    });
  }
}
searchAll();
