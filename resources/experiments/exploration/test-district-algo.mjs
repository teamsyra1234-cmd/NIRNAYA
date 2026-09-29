const pilotDistricts = [
  { canonical: 'Kancheepuram', state: 'Tamil Nadu', patterns: [/\bkancheepuram\b/i, /\bkanchipuram\b/i] },
  { canonical: 'Chennai', state: 'Tamil Nadu', patterns: [/\bchennai\b/i, /\bmadras\b/i] },
  { canonical: 'Tiruvallur', state: 'Tamil Nadu', patterns: [/\btiruvallur\b/i, /\bthiruvallur\b/i] },
  { canonical: 'Coimbatore', state: 'Tamil Nadu', patterns: [/\bcoimbatore\b/i, /\bkovai\b/i] },
  { canonical: 'Pune', state: 'Maharashtra', patterns: [/\bpune\b/i, /\bpoona\b/i] },
  { canonical: 'Jaipur', state: 'Rajasthan', patterns: [/\bjaipur\b/i] },
];

const states = [
  { canonical: 'Tamil Nadu', patterns: [/\btamil\s*nadu\b/i, /\btamilnadu\b/i] },
  { canonical: 'Maharashtra', patterns: [/\bmaharashtra\b/i] },
  { canonical: 'Gujarat', patterns: [/\bgujarat\b/i] },
  { canonical: 'Rajasthan', patterns: [/\brajasthan\b/i] },
];

function textMatchesDistrict(text, districtName) {
  if (!text || !districtName) return false;
  const d = pilotDistricts.find(x => x.canonical.toLowerCase() === districtName.toLowerCase());
  if (d) {
    return d.patterns.some(pat => pat.test(text));
  }
  return new RegExp(`\\b${districtName}\\b`, 'i').test(text);
}

function textMatchesState(text, stateName) {
  if (!text || !stateName) return false;
  const s = states.find(x => x.canonical.toLowerCase() === stateName.toLowerCase());
  if (s) {
    return s.patterns.some(pat => pat.test(text));
  }
  return new RegExp(`\\b${stateName}\\b`, 'i').test(text);
}

function calculateScore(item, geo, topicWords) {
  const { district, state, parentState } = geo;
  const effectiveState = state || parentState;

  const topicInTitle = topicWords.length > 0 && topicWords.some(w => new RegExp(`\\b${w}\\b`, 'i').test(item.title));
  const topicInDesc = topicWords.length > 0 && topicWords.some(w => new RegExp(`\\b${w}\\b`, 'i').test(item.description));

  // Authoritative district check (title and jurisdiction/department metadata ONLY)
  const districtInTitle = district ? textMatchesDistrict(item.title, district) : false;
  const districtInJur = district ? (
    textMatchesDistrict(item.state, district) ||
    textMatchesDistrict(item.jurisdiction, district) ||
    textMatchesDistrict(item.department, district) ||
    textMatchesDistrict(item.ministry, district)
  ) : false;

  const matchesDistrict = districtInTitle || districtInJur;

  // 1. Highest: District match
  if (matchesDistrict) {
    if (topicInTitle) return 240;
    if (topicInDesc) return 220;
    // District match without topic match
    return 130;
  }

  // 2. Next: Matching State
  if (effectiveState) {
    const stateInTitle = textMatchesState(item.title, effectiveState);
    const stateInJur = textMatchesState(item.state, effectiveState) ||
      textMatchesState(item.jurisdiction, effectiveState) ||
      textMatchesState(item.department, effectiveState) ||
      textMatchesState(item.ministry, effectiveState);

    // Is it another district in the same state?
    const isOtherDistrictInSameState = pilotDistricts.some(
      d => d.state === effectiveState && d.canonical !== district && (
        textMatchesDistrict(item.title, d.canonical) || textMatchesDistrict(item.jurisdiction, d.canonical)
      )
    );

    if (stateInTitle || stateInJur) {
      if (!isOtherDistrictInSameState) {
        // State-wide dataset for target state
        if (topicInTitle) return 180;
        if (topicInDesc) return 160;
        return 110;
      } else {
        // Another district in same state
        if (topicInTitle) return 140;
        if (topicInDesc) return 120;
        return 90;
      }
    }
  }

  // 3. Next: National / All-India dataset
  const combined = `${item.state || ''} ${item.jurisdiction || ''} ${item.ministry || ''}`.toLowerCase();
  const isNational = combined.includes('all india') || combined.includes('national') || combined.includes('central');

  // Check conflicting state
  const isConflictingState = states.some(
    s => s.canonical !== effectiveState && (
      textMatchesState(item.state, s.canonical) ||
      textMatchesState(item.jurisdiction, s.canonical) ||
      textMatchesState(item.department, s.canonical)
    )
  );

  if (isNational && !isConflictingState) {
    if (topicInTitle) return 80;
    if (topicInDesc) return 70;
    return 50;
  }

  // 4. Lower: Neutral dataset
  if (!isConflictingState) {
    if (topicInTitle) return 40;
    if (topicInDesc) return 35;
    return 30;
  }

  // 5. Lowest: Explicitly conflicting geography
  if (topicInTitle) return 20;
  if (topicInDesc) return 15;
  return 10;
}

async function run() {
  const q = 'rainfall Kancheepuram';
  const url = `https://www.data.gov.in/backend/dmspublic/v1/catalogs?query=${encodeURIComponent(q)}&offset=0&limit=100`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const data = await res.json();
  const rows = data.data?.rows || [];

  const geo = { district: 'Kancheepuram', state: null, parentState: 'Tamil Nadu' };
  const topicWords = ['rainfall'];

  const items = rows.map((r, i) => {
    const title = (r.title?.[0] || '').trim();
    const jur = (r['field_asset_jurisdiction:name'] || []).join(', ');
    const desc = (r['body:value']?.[0] || '').slice(0, 100);
    return {
      index: i,
      title,
      state: jur || undefined,
      jurisdiction: jur || undefined,
      description: desc,
    };
  });

  items.sort((a, b) => {
    const sA = calculateScore(a, geo, topicWords);
    const sB = calculateScore(b, geo, topicWords);
    if (sB !== sA) return sB - sA;
    return a.index - b.index;
  });

  console.log(`Top 10 ranked results for "${q}":`);
  items.slice(0, 10).forEach((it, i) => {
    const s = calculateScore(it, geo, topicWords);
    console.log(`  ${i + 1}. [Score ${s}] "${it.title.slice(0, 60)}" | State/Jur: "${it.state || 'N/A'}"`);
  });
}
run();
