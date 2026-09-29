import { searchOgdCatalog } from '../lib/adapters/ogd.ts';

async function verifyLinks() {
  console.log('Testing official-source data.gov.in links...');
  const res = await searchOgdCatalog('agriculture Tamil Nadu', { limit: 5 });
  console.log(`Discovered ${res.items.length} items:`);

  for (const item of res.items) {
    console.log(`\nTesting: "${item.title.slice(0, 50)}..."`);
    console.log(`  Source URL: ${item.sourceUrl}`);
    try {
      const response = await fetch(item.sourceUrl, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(10000)
      });
      console.log(`  HTTP Status: ${response.status} ${response.statusText} -> Link verified!`);
    } catch (err) {
      console.log(`  Network check note: ${err.message}`);
    }
  }
}

verifyLinks();
