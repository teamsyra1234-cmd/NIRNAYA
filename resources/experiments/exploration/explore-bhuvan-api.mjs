import fs from 'fs';

async function main() {
  const res = await fetch('https://bhuvan-app1.nrsc.gov.in/api/', {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(15000)
  });
  const text = await res.text();
  fs.writeFileSync('scratch/bhuvan-api-portal.html', text);
  console.log('Saved bhuvan-api-portal.html, length:', text.length);

  // Search for LULC or Statistics mentions
  const lines = text.split('\n');
  lines.forEach((l, idx) => {
    const lower = l.toLowerCase();
    if (lower.includes('lulc') || lower.includes('statistics') || lower.includes('50k') || lower.includes('250k')) {
      console.log(`Line ${idx + 1}: ${l.trim().slice(0, 150)}`);
    }
  });
}

main().catch(console.error);
