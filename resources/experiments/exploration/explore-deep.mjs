async function run() {
  for (let offset = 0; offset <= 100; offset += 50) {
    const res = await fetch(`https://www.data.gov.in/backend/dmspublic/v1/catalogs?query=agriculture+Tamil+Nadu&offset=${offset}&limit=50`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const data = await res.json();
    data.data?.rows?.forEach((r, i) => {
      const title = r.title?.[0] || '';
      const jur = (r['field_asset_jurisdiction:name'] || []).join(', ');
      const desc = (r['body:value']?.[0] || '').slice(0, 100);
      if (jur.toLowerCase().includes('tamil') || title.toLowerCase().includes('tamil')) {
        console.log(`[Offset ${offset} + ${i}] Jur: "${jur}" | Title: "${title.slice(0, 80)}"`);
      }
    });
  }
}
run();
