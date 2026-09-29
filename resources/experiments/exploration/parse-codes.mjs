import fs from 'fs';

const text = fs.readFileSync('scratch/getlucode.html', 'utf-8');
const regex = /<td[^>]*bgcolor="([^"]+)"><\/td><td>([^<]+)<\/td><td>([^<]+)<\/td>/g;
let m;
const classes = [];
while ((m = regex.exec(text)) !== null) {
  classes.push({ color: m[1].trim(), name: m[2].trim(), code: m[3].trim() });
}
console.log('Total Land Use Classes:', classes.length);
classes.forEach(c => console.log(`${c.code} -> ${c.name} (${c.color})`));
