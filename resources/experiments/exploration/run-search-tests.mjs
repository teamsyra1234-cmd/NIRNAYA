async function runTests() {
  const searches = [
    'rainfall',
    'land',
    'groundwater',
    'agriculture Tamil Nadu'
  ];

  console.log('================================================================');
  console.log('NIRNAYA LIVE OGD EVIDENCE DISCOVERY VERIFICATION');
  console.log('================================================================');

  const report = {};

  for (const q of searches) {
    console.log(`\n----------------------------------------------------------------`);
    console.log(`TEST SEARCH: "${q}"`);
    console.log(`----------------------------------------------------------------`);

    // 1. Test dedicated OGD discovery endpoint
    const ogdUrl = `http://localhost:3000/api/v1/ogd/search?q=${encodeURIComponent(q)}&limit=5`;
    const ogdRes = await fetch(ogdUrl);
    const ogdData = await ogdRes.json();

    // 2. Test combined evidence endpoint with includeOgd=true
    const combUrl = `http://localhost:3000/api/v1/evidence?q=${encodeURIComponent(q)}&includeOgd=true`;
    const combRes = await fetch(combUrl);
    const combData = await combRes.json();

    console.log(`[OGD Discovery Endpoint] Status: ${ogdRes.status}`);
    console.log(`  - Success: ${ogdData.success}`);
    console.log(`  - Total Matching OGD Datasets: ${ogdData.total}`);
    console.log(`  - Items Returned: ${ogdData.items?.length}`);
    console.log(`  - Source Authority: ${ogdData.source}`);
    console.log(`  - Search Endpoint Used: ${ogdData.searchEndpoint}`);

    console.log(`[Combined Evidence Endpoint] Status: ${combRes.status}`);
    console.log(`  - Curated NIRNAYA DB Evidence Records: ${combData.total}`);
    console.log(`  - Live OGD Discovered Datasets: ${combData.ogd?.total}`);

    console.log(`\nExample Live OGD Results for "${q}":`);
    const examples = [];
    for (let i = 0; i < Math.min(3, ogdData.items?.length || 0); i++) {
      const it = ogdData.items[i];
      console.log(`  ${i + 1}. Title: ${it.title}`);
      console.log(`     Ministry / Org: ${it.ministry}${it.department ? ' / ' + it.department : ''}`);
      console.log(`     Location/Jurisdiction: ${it.state || 'National'}`);
      console.log(`     Last Updated: ${it.lastUpdated || it.publishedDate || 'N/A'}`);
      console.log(`     Official URL: ${it.sourceUrl}`);
      examples.push(it.title);
    }

    report[q] = {
      ogdTotal: ogdData.total,
      curatedTotal: combData.total,
      examples
    };
  }

  console.log('\n================================================================');
  console.log('SUMMARY REPORT JSON:');
  console.log(JSON.stringify(report, null, 2));
}

runTests();
