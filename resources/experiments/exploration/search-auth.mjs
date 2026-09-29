import fs from 'fs';

const text = fs.readFileSync('scratch/bhuvan-api-portal.html', 'utf-8');

const lines = text.split('\n');
lines.forEach((l, idx) => {
  const lower = l.toLowerCase();
  if ((lower.includes('token') || lower.includes('login') || lower.includes('key') || lower.includes('oauth') || lower.includes('auth')) &&
      (l.includes('.php') || l.includes('http') || l.includes('action') || l.includes('function') || l.includes('modal') || l.includes('ajax'))) {
    console.log(`L${idx+1}: ${l.trim().slice(0, 140)}`);
  }
});
