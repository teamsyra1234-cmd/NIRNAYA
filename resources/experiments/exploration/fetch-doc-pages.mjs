import fs from 'fs';

const pages = [
  { name: 'dist', url: 'https://bhuvan-app1.nrsc.gov.in/api/get/dist.php' },
  { name: 'aoi', url: 'https://bhuvan-app1.nrsc.gov.in/api/get/aoi.php' },
  { name: 'point', url: 'https://bhuvan-app1.nrsc.gov.in/api/get/point.php' },
  { name: 'laoi', url: 'https://bhuvan-app1.nrsc.gov.in/api/get/laoi.php' },
];

async function main() {
  for (const p of pages) {
    try {
      console.log(`Fetching ${p.name} from ${p.url}...`);
      const res = await fetch(p.url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(15000)
      });
      console.log(`${p.name} -> Status: ${res.status}`);
      const text = await res.text();
      fs.writeFileSync(`scratch/${p.name}.html`, text);
      console.log(`${p.name} saved, length: ${text.length}`);
    } catch (err) {
      console.error(`Error fetching ${p.name}:`, err.message);
    }
  }
}

main().catch(console.error);
