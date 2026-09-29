import fs from 'fs';

async function main() {
  const url = 'https://bhuvan-app1.nrsc.gov.in/thematic/thematic/lib/uncomp/script2.js';
  console.log('Fetching:', url);
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(20000)
  });
  console.log('Status:', res.status);
  const text = await res.text();
  fs.writeFileSync('scratch/thematic-script2.js', text);
  console.log('Saved scratch/thematic-script2.js, length:', text.length);

  // Search for statistics function
  const lines = text.split('\n');
  lines.forEach((l, idx) => {
    const lower = l.toLowerCase();
    if (lower.includes('stat') && (lower.includes('url') || lower.includes('ajax') || lower.includes('function') || lower.includes('.php'))) {
      console.log(`L${idx+1}: ${l.trim().slice(0, 140)}`);
    }
  });
}

main().catch(console.error);
