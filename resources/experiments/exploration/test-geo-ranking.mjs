const states = [
  { canonical: 'Tamil Nadu', patterns: [/\btamil\s*nadu\b/i, /\btamilnadu\b/i] },
  { canonical: 'Kerala', patterns: [/\bkerala\b/i] },
  { canonical: 'Karnataka', patterns: [/\bkarnataka\b/i] },
  { canonical: 'Andhra Pradesh', patterns: [/\bandhra\s*pradesh\b/i, /\bandhra\b/i] },
  { canonical: 'Telangana', patterns: [/\btelangana\b/i] },
  { canonical: 'Maharashtra', patterns: [/\bmaharashtra\b/i] },
  { canonical: 'Gujarat', patterns: [/\bgujarat\b/i] },
  { canonical: 'Rajasthan', patterns: [/\brajasthan\b/i] },
  { canonical: 'Punjab', patterns: [/\bpunjab\b/i] },
  { canonical: 'Haryana', patterns: [/\bharyana\b/i] },
  { canonical: 'Uttar Pradesh', patterns: [/\buttar\s*pradesh\b/i] },
  { canonical: 'Madhya Pradesh', patterns: [/\bmadhya\s*pradesh\b/i] },
  { canonical: 'West Bengal', patterns: [/\bwest\s*bengal\b/i, /\bbengal\b/i] },
  { canonical: 'Odisha', patterns: [/\bodisha\b/i, /\borissa\b/i] },
  { canonical: 'Bihar', patterns: [/\bbihar\b/i] },
  { canonical: 'Jharkhand', patterns: [/\bjharkhand\b/i] },
  { canonical: 'Chhattisgarh', patterns: [/\bchhattisgarh\b/i, /\bchhattishgarh\b/i] },
  { canonical: 'Assam', patterns: [/\bassam\b/i] },
  { canonical: 'Delhi', patterns: [/\bdelhi\b/i, /\bnew\s*delhi\b/i] },
];

export function detectIndianGeography(query) {
  if (!query) return null;
  for (const s of states) {
    for (const pat of s.patterns) {
      if (pat.test(query)) return s.canonical;
    }
  }
  return null;
}

export function textMatchesState(text, stateName) {
  if (!text) return false;
  const escaped = stateName.replace(/\s+/g, '\\s+');
  return new RegExp('\\b' + escaped + '\\b', 'i').test(text);
}

export function belongsToOtherState(item, targetState) {
  for (const s of states) {
    if (s.canonical.toLowerCase() === targetState.toLowerCase()) continue;
    if (textMatchesState(item.state, s.canonical) ||
        textMatchesState(item.jurisdiction, s.canonical) ||
        textMatchesState(item.ministry, s.canonical) ||
        textMatchesState(item.department, s.canonical)) {
      return true;
    }
  }
  return false;
}

export function isNationalDataset(item) {
  const geo = ((item.state || '') + ' ' + (item.jurisdiction || '')).toLowerCase();
  if (geo.includes('all india') || geo.includes('national') || geo.includes('india')) return true;
  const min = (item.ministry || '').toLowerCase();
  if (min.includes('ministry of') || min.includes('central') || min.includes('government of india')) return true;
  return false;
}

export function calculateScore(item, targetState) {
  if (!targetState) return 0;
  if (textMatchesState(item.title, targetState)) return 100;
  if (textMatchesState(item.state, targetState) ||
      textMatchesState(item.jurisdiction, targetState) ||
      textMatchesState(item.ministry, targetState) ||
      textMatchesState(item.department, targetState)) return 80;
  if (textMatchesState(item.description, targetState)) return 60;
  const other = belongsToOtherState(item, targetState);
  if (isNationalDataset(item) && !other) return 40;
  if (!other) return 20;
  return 10;
}

async function test(query, limit = 5) {
  const geo = detectIndianGeography(query);
  console.log('\n========================================');
  console.log(`Query: "${query}" -> Detected Geo: ${geo}`);
  const fetchLimit = geo ? Math.min(50, Math.max(limit * 3, 30)) : limit;
  const url = 'https://www.data.gov.in/backend/dmspublic/v1/catalogs?query=' + encodeURIComponent(query) + '&offset=0&limit=' + fetchLimit;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const data = await res.json();
  const rows = data.data?.rows || [];
  
  let items = rows.map((r, i) => {
    const title = (r.title?.[0] || '').trim();
    const stList = (r['field_asset_jurisdiction:name'] || []).concat(r['field_state_department:name'] || []);
    const min = (r['field_ministry_department:name'] || r['field_state_department:name'] || [])[0] || '';
    return {
      index: i,
      title,
      state: stList.join(', '),
      jurisdiction: (r['field_asset_jurisdiction:name'] || []).join(', '),
      ministry: min,
      description: r['body:value']?.[0] || ''
    };
  });

  if (geo) {
    items.sort((a, b) => {
      const sA = calculateScore(a, geo);
      const sB = calculateScore(b, geo);
      if (sB !== sA) return sB - sA;
      return a.index - b.index;
    });
  }

  const finalItems = items.slice(0, limit);
  finalItems.forEach((it, i) => {
    const score = calculateScore(it, geo);
    console.log(`  ${i + 1}. [Score ${score}] ${it.title.slice(0, 70)} | State: ${it.state.slice(0, 30)}`);
  });
}

async function run() {
  await test('agriculture Tamil Nadu');
  await test('rainfall');
  await test('groundwater Tamil Nadu');
  await test('Tamil Nadu');
  await test('land');
}
run();
