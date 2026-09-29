import fs from 'fs';

const text = fs.readFileSync('scratch/thematic-script2.js', 'utf-8');
const regex = /['"][^'"]*\.php[^'"]*['"]/g;
let m;
const phpUrls = new Set();
while ((m = regex.exec(text)) !== null) {
  phpUrls.add(m[0]);
}
console.log('PHP endpoints in script2.js:');
phpUrls.forEach(u => console.log(u));
