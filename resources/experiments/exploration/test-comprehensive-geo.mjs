
const INDIAN_STATES = [
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
  if (!query || typeof query !== 'string') return null;
  const trimmed = query.trim();
  for (const s of INDIAN_STATES) {
    for (const pat of s.patterns) {
      if (pat.test(trimmed)) return s.canonical;
    }
  }
  return null;
}

export function extractTopicKeywords(query, detectedState) {
  if (!query) return [];
  let cleaned = query;
  if (detectedState) {
    const s = INDIAN_STATES.find(item => item.canonical === detectedState);
    if (s) {
      for (const pat of s.patterns) {
        cleaned = cleaned.replace(pat, ' ');
      }
    }
  }
  return cleaned
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(w => w.length > 2);
}

export function textContainsWord(text, word) {
  if (!text || !word) return false;
  return new RegExp('\\b' + word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(text);
}

export function textMatchesState(text, stateName) {
  if (!text || !stateName) return false;
  const s = INDIAN_STATES.find(item => item.canonical.toLowerCase() === stateName.toLowerCase());
  if (s) {
    return s.patterns.some(pat => pat.test(text));
  }
  return new RegExp('\\b' + stateName.replace(/\s+/g, '\\s+') + '\\b', 'i').test(text);
}

export function belongsToOtherState(item, targetState) {
  const combined = [
    item.state || '',
    item.jurisdiction || '',
    item.department || '',
    item.ministry || '',
  ].join(' ');

  for (const s of INDIAN_STATES) {
    if (s.canonical.toLowerCase() === targetState.toLowerCase()) continue;
    if (s.patterns.some(pat => pat.test(combined))) {
      return true;
    }
  }
  return false;
}

export function isNationalDataset(item) {
  const combined = [
    item.state || '',
    item.jurisdiction || '',
    item.department || '',
    item.ministry || '',
  ].join(' ').toLowerCase();

  return (
    combined.includes('all india') ||
    combined.includes('national') ||
    combined.includes('government of india') ||
    combined.includes('ministry of') ||
    combined.includes('central')
  );
}

export function calculateGeographicRelevanceScore(item, targetState, topicWords = []) {
  if (!targetState) return 0;

  const stateInTitle = textMatchesState(item.title, targetState);
  const stateInMetadata =
    textMatchesState(item.state, targetState) ||
    textMatchesState(item.jurisdiction, targetState) ||
    textMatchesState(item.department, targetState) ||
    textMatchesState(item.ministry, targetState) ||
    textMatchesState(item.description, targetState);

  const hasTopicInTitle = topicWords.length > 0 && topicWords.some(w => textContainsWord(item.title, w));
  const hasTopicInDesc = topicWords.length > 0 && topicWords.some(w => textContainsWord(item.description, w) || textContainsWord(item.sector, w));

  const otherState = belongsToOtherState(item, targetState);
  const national = isNationalDataset(item);

  // 1. Exact state/geography match in title/name: highest relevance
  if (stateInTitle) {
    if (hasTopicInTitle) return 120;
    if (hasTopicInDesc) return 110;
    return 100;
  }

  // 2. State/geography match in description/metadata: next highest
  if (stateInMetadata) {
    if (hasTopicInTitle) return 90;
    if (hasTopicInDesc) return 85;
    return 80;
  }

  // 3. Keyword match without state match (e.g. All India / Neutral national datasets)
  if (!otherState) {
    if (national) {
      if (hasTopicInTitle) return 60;
      if (hasTopicInDesc) return 50;
      return 45;
    }
    // Neutral without state
    if (hasTopicInTitle) return 40;
    if (hasTopicInDesc) return 35;
    return 30;
  }

  // 4. Results clearly belonging to another state: ranked below matching-state results
  if (hasTopicInTitle) return 20;
  if (hasTopicInDesc) return 15;
  return 10;
}

async function testQuery(query, limit = 5) {
  const geo = detectIndianGeography(query);
  const topicWords = extractTopicKeywords(query, geo);
  console.log(`\n======================================================`);
  console.log(`Query: "${query}"`);
  console.log(`  -> Detected Geo: "${geo}" | Topics: ${JSON.stringify(topicWords)}`);

  const fetchLimit = geo ? Math.min(50, Math.max(limit * 3, 30)) : limit;
  const url = `https://www.data.gov.in/backend/dmspublic/v1/catalogs?query=${encodeURIComponent(query)}&offset=0&limit=${fetchLimit}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const data = await res.json();
  const rows = data.data?.rows || [];

  let items = rows.map((r, i) => {
    const title = (r.title?.[0] || '').trim();
    const jur = (r['field_asset_jurisdiction:name'] || []).join(', ');
    const dep = (r['field_state_department:name'] || []).join(', ');
    const min = (r['field_ministry_department:name'] || [])[0] || '';
    const desc = (r['body:value']?.[0] || '').slice(0, 120);
    return {
      index: i,
      title,
      state: jur || undefined,
      jurisdiction: jur || undefined,
      department: dep || undefined,
      ministry: min || 'Government of India',
      description: desc,
      sourceUrl: `https://data.gov.in/node/${r.nid?.[0] || ''}`
    };
  });

  if (geo) {
    items.sort((a, b) => {
      const scoreA = calculateGeographicRelevanceScore(a, geo, topicWords);
      const scoreB = calculateGeographicRelevanceScore(b, geo, topicWords);
      if (scoreB !== scoreA) {
        return scoreB - scoreA;
      }
      return a.index - b.index; // Stable sort
    });
  }

  const finalItems = items.slice(0, limit);
  finalItems.forEach((it, i) => {
    const score = calculateGeographicRelevanceScore(it, geo, topicWords);
    console.log(`  ${i + 1}. [Score: ${score}] "${it.title.slice(0, 60)}" | State: "${it.state || 'N/A'}"`);
  });
}

async function run() {
  await testQuery('agriculture Tamil Nadu', 5);
  await testQuery('rainfall', 5);
  await testQuery('groundwater Tamil Nadu', 5);
  await testQuery('Tamil Nadu', 5);
  await testQuery('land', 5);
  await testQuery('wetland conservation', 5);
  await testQuery('highland agriculture', 5);
}

run();
