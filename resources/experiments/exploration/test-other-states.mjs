import { detectIndianGeography, extractTopicKeywords, calculateGeographicRelevanceScore } from './test-comprehensive-geo.mjs';

async function test(query) {
  const geo = detectIndianGeography(query);
  const topicWords = extractTopicKeywords(query, geo);
  const fetchLimit = 30;
  const url = `https://www.data.gov.in/backend/dmspublic/v1/catalogs?query=${encodeURIComponent(query)}&offset=0&limit=${fetchLimit}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const data = await res.json();
  const rows = data.data?.rows || [];

  let items = rows.map((r, i) => {
    const title = (r.title?.[0] || '').trim();
    const jur = (r['field_asset_jurisdiction:name'] || []).join(', ');
    const dep = (r['field_state_department:name'] || []).join(', ');
    const min = (r['field_ministry_department:name'] || [])[0] || '';
    const desc = (r['body:value']?.[0] || '').slice(0, 120);
    return {
      index: i,
      title,
      state: jur || undefined,
      jurisdiction: jur || undefined,
      department: dep || undefined,
      ministry: min || 'Government of India',
      description: desc,
    };
  });

  items.sort((a, b) => {
    const scoreA = calculateGeographicRelevanceScore(a, geo, topicWords);
    const scoreB = calculateGeographicRelevanceScore(b, geo, topicWords);
    if (scoreB !== scoreA) return scoreB - scoreA;
    return a.index - b.index;
  });

  console.log(`\nQuery: "${query}" -> Geo: ${geo}`);
  items.slice(0, 4).forEach((it, i) => {
    const score = calculateGeographicRelevanceScore(it, geo, topicWords);
    console.log(`  ${i + 1}. [Score: ${score}] "${it.title.slice(0, 55)}" | State: "${it.state || 'N/A'}"`);
  });
}

async function run() {
  await test('agriculture Maharashtra');
  await test('agriculture Gujarat');
  await test('agriculture Punjab');
}
run();
