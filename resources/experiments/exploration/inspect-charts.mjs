import fs from 'fs';

const text = fs.readFileSync('scratch/thematic-script2.js', 'utf-8');

function findContext(keyword) {
  let pos = 0;
  while ((pos = text.indexOf(keyword, pos)) !== -1) {
    console.log(`\n=== Keyword: ${keyword} at pos ${pos} ===`);
    console.log(text.slice(Math.max(0, pos - 150), Math.min(text.length, pos + 400)));
    pos += keyword.length;
  }
}

findContext('loadchart.php');
findContext('genchart.php');
findContext('chart_glwb.php');
