import fs from 'fs';

const pages = [
  { name: 'getdistcode', url: 'https://bhuvan-app1.nrsc.gov.in/api/get/getdistcode.php' },
  { name: 'getstatcode', url: 'https://bhuvan-app1.nrsc.gov.in/api/get/getstatcode.php' },
  { name: 'getlucode', url: 'https://bhuvan-app1.nrsc.gov.in/api/get/getlucode.php' },
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
