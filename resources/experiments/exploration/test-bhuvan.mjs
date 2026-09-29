async function testEndpoints() {
  const endpoints = [
    "https://bhuvan-vec2.nrsc.gov.in/bhuvan/wms?service=WMS&version=1.1.1&request=GetCapabilities",
    "https://bhuvan-app1.nrsc.gov.in/bhuvan/wms?service=WMS&version=1.1.1&request=GetCapabilities",
    "https://bhuvan-vec1.nrsc.gov.in/bhuvan/wms?service=WMS&version=1.1.1&request=GetCapabilities",
    "https://bhuvan-ras1.nrsc.gov.in/bhuvan/wms?service=WMS&version=1.1.1&request=GetCapabilities",
    "https://bhuvan.nrsc.gov.in",
  ];

  for (const url of endpoints) {
    console.log(`\nTesting: ${url}`);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      console.log(`Status: ${res.status} ${res.statusText}`);
      const text = await res.text();
      console.log(`Length: ${text.length}, Preview: ${text.slice(0, 200).replace(/\n/g, ' ')}`);
    } catch (err) {
      console.log(`Error: ${err.message}`);
    }
  }
}

testEndpoints();
