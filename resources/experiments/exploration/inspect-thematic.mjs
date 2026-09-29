import fs from 'fs';

async function main() {
  const res = await fetch('https://bhuvan-app1.nrsc.gov.in/thematic/thematic/index.php', {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(15000)
  });
  const text = await res.text();
  fs.writeFileSync('scratch/thematic-index.html', text);
  console.log('Saved scratch/thematic-index.html, length:', text.length);

  // Search for script tags and statistics mentions
  const lines = text.split('\n');
  lines.forEach((l, idx) => {
    if (l.includes('<script') || l.toLowerCase().includes('stat') || l.toLowerCase().includes('lulc')) {
      console.log(`L${idx+1}: ${l.trim().slice(0, 140)}`);
    }
  });
}

main().catch(console.error);
