import { searchOgdCatalog, calculateGeographicRelevanceScore, detectIndianGeography, extractTopicKeywords } from '../lib/adapters/ogd.ts';

async function testDetail() {
  const q = 'rainfall Kancheepuram Tamil Nadu';
  const geo = detectIndianGeography(q);
  const topicWords = extractTopicKeywords(q, geo);
  console.log('Geo:', geo);
  console.log('Topic words:', topicWords);

  const res = await searchOgdCatalog(q, { limit: 10 });
  console.log(`Discovered ${res.items.length} items:`);
  res.items.slice(0, 8).forEach((it, idx) => {
    const score = calculateGeographicRelevanceScore(it, geo, topicWords);
    console.log(`  ${idx + 1}. [Score ${score}] ${it.title} | State: ${it.state}`);
  });
}

testDetail();
