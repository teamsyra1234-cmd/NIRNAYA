import fs from 'fs';

async function testEndpoint(name, url, headers = {}) {
  console.log(`\n========================================`);
  console.log(`Testing: ${name}`);
  console.log(`URL: ${url}`);
  try {
    const start = Date.now();
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Content-Type': 'application/x-www-form-urlencoded',
        ...headers
      },
      signal: AbortSignal.timeout(15000)
    });
    const time = Date.now() - start;
    console.log(`HTTP Status: ${res.status} ${res.statusText} (${time}ms)`);
    console.log(`Content-Type: ${res.headers.get('content-type')}`);
    const text = await res.text();
    console.log(`Response length: ${text.length} bytes`);
    console.log(`Response snippet (first 500 chars):\n${text.slice(0, 500)}`);
    return { name, url, status: res.status, text };
  } catch (err) {
    console.error(`ERROR: ${err.message}`);
    return { name, url, error: err.message };
  }
}

async function run() {
  // Test 1: LULC 50k Statistics (curljson.php) for Kancheepuram (distcode=3303, year=1112)
  await testEndpoint('LULC 50K - Kancheepuram no token', 'https://bhuvan-app1.nrsc.gov.in/api/lulc/curljson.php?distcode=3303&year=1112');
  await testEndpoint('LULC 50K - Kancheepuram empty token', 'https://bhuvan-app1.nrsc.gov.in/api/lulc/curljson.php?distcode=3303&year=1112&token=');
  await testEndpoint('LULC 50K - Kancheepuram dummy token', 'https://bhuvan-app1.nrsc.gov.in/api/lulc/curljson.php?distcode=3303&year=1112&token=test');
  await testEndpoint('LULC 50K - curlpie Kancheepuram', 'https://bhuvan-app1.nrsc.gov.in/api/lulc/curlpie.php?distcode=3303&year=1112');

  // Test 2: LULC 50k AOI Wise (curl_aoi.php)
  const aoiGeom = encodeURIComponent('POLYGON((79.55 12.22, 80.26 12.22, 80.26 13.06, 79.55 13.06, 79.55 12.22))');
  await testEndpoint('LULC 50K AOI - no token', `https://bhuvan-app1.nrsc.gov.in/api/lulc/curl_aoi.php?geom=${aoiGeom}`);
  await testEndpoint('LULC 50K AOI - dummy token', `https://bhuvan-app1.nrsc.gov.in/api/lulc/curl_aoi.php?geom=${aoiGeom}&token=test`);

  // Test 3: LULC 250k Point (curl_lulc250k_point.php) for Kancheepuram coords (79.70, 12.83)
  await testEndpoint('LULC 250K Point - no token', 'https://bhuvan-app1.nrsc.gov.in/api/lulc250k/curl_lulc250k_point.php?lon=79.70&lat=12.83&year=all');
  await testEndpoint('LULC 250K Point - dummy token', 'https://bhuvan-app1.nrsc.gov.in/api/lulc250k/curl_lulc250k_point.php?lon=79.70&lat=12.83&year=all&token=test');

  // Test 4: LULC 250k AOI (curl_lulc250k.php)
  await testEndpoint('LULC 250K AOI - no token', `https://bhuvan-app1.nrsc.gov.in/api/lulc250k/curl_lulc250k.php?polygon=${aoiGeom}&year=all&option=json`);
  await testEndpoint('LULC 250K AOI - dummy token', `https://bhuvan-app1.nrsc.gov.in/api/lulc250k/curl_lulc250k.php?polygon=${aoiGeom}&year=all&option=json&token=test`);
}

run().catch(console.error);
