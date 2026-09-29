import fs from 'fs';

const districts = [
  { name: 'Kancheepuram', state: 'Tamil Nadu', distcode: '3303', statcode: 'TN', sisdpLayer: 'sisdpv2:TN_Kancheepuram_lulc_v2', bbox: '79.5597,12.2288,80.2664,13.0630' },
  { name: 'Chennai', state: 'Tamil Nadu', distcode: '3302', statcode: 'TN', sisdpLayer: 'sisdpv2:TN_Chennai_lulc_v2', bbox: '80.1,12.9,80.35,13.2' },
  { name: 'Tiruvallur', state: 'Tamil Nadu', distcode: '3301', statcode: 'TN', sisdpLayer: 'sisdpv2:TN_Thiruvallur_lulc_v2', bbox: '79.7,13.0,80.3,13.5' },
  { name: 'Coimbatore', state: 'Tamil Nadu', distcode: '3312', statcode: 'TN', sisdpLayer: 'sisdpv2:TN_Coimbatore_lulc_v2', bbox: '76.6,10.7,77.3,11.5' },
  { name: 'Pune', state: 'Maharashtra', distcode: '2725', statcode: 'MH', sisdpLayer: 'sisdpv2:MH_Pune_lulc_v2', bbox: '73.3,18.0,75.2,19.4' },
  { name: 'Jaipur', state: 'Rajasthan', distcode: '0812', statcode: 'RJ', sisdpLayer: 'sisdpv2:RJ_Jaipur_lulc_v2', bbox: '74.9,26.5,76.3,27.9' },
];

async function checkDistricts() {
  console.log('=== VERIFYING 6 PILOT DISTRICTS IN SIS-DP WMS & DEVELOPER API ===\n');

  for (const d of districts) {
    console.log(`----------------------------------------------------------------`);
    console.log(`District: ${d.name} (${d.state}) | distcode=${d.distcode} | statcode=${d.statcode}`);
    console.log(`SIS-DP Layer: ${d.sisdpLayer}`);

    // 1. Check Developer API (curljson.php) with distcode
    const apiUrl = `https://bhuvan-app1.nrsc.gov.in/api/lulc/curljson.php?distcode=${d.distcode}&year=1112`;
    try {
      const apiRes = await fetch(apiUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(10000)
      });
      const apiText = await apiRes.text();
      console.log(`Developer API (no token) -> Status: ${apiRes.status}, Body length: ${apiText.length}`);

      // With dummy token to see error message
      const apiTokenRes = await fetch(`${apiUrl}&token=test`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(10000)
      });
      const tokenText = await apiTokenRes.text();
      console.log(`Developer API (with token) -> ${tokenText.trim()}`);
    } catch (err) {
      console.log(`Developer API -> Error: ${err.message}`);
    }

    // 2. Check SIS-DP WMS GetMap reachability
    const wmsMapUrl = `https://bhuvan-vec2.nrsc.gov.in/bhuvan/sisdpv2/wms?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=${encodeURIComponent(d.sisdpLayer)}&STYLES=&BBOX=${d.bbox}&WIDTH=256&HEIGHT=256&SRS=EPSG:4326&FORMAT=image/png&TRANSPARENT=TRUE`;
    try {
      const mapRes = await fetch(wmsMapUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(15000)
      });
      const ct = mapRes.headers.get('content-type');
      const buf = await mapRes.arrayBuffer();
      console.log(`SIS-DP WMS GetMap -> Status: ${mapRes.status}, Content-Type: ${ct}, Size: ${buf.byteLength} bytes`);
      if (ct && ct.includes('xml')) {
        console.log(`XML error response: ${new TextDecoder().decode(buf.slice(0, 300))}`);
      }
    } catch (err) {
      console.log(`SIS-DP WMS GetMap -> Error: ${err.message}`);
    }

    // 3. Check SIS-DP WMS GetFeatureInfo (for attribute statistics)
    const gfiUrl = `https://bhuvan-vec2.nrsc.gov.in/bhuvan/sisdpv2/wms?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetFeatureInfo&LAYERS=${encodeURIComponent(d.sisdpLayer)}&QUERY_LAYERS=${encodeURIComponent(d.sisdpLayer)}&BBOX=${d.bbox}&WIDTH=256&HEIGHT=256&X=128&Y=128&SRS=EPSG:4326&INFO_FORMAT=application/json`;
    try {
      const gfiRes = await fetch(gfiUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(15000)
      });
      const gfiCt = gfiRes.headers.get('content-type');
      if (gfiRes.status === 200 && gfiCt && gfiCt.includes('json')) {
        const gfiData = await gfiRes.json();
        console.log(`SIS-DP GetFeatureInfo -> Features returned: ${gfiData.features?.length || 0}`);
        if (gfiData.features && gfiData.features.length > 0) {
          console.log(`Sample properties:`, JSON.stringify(gfiData.features[0].properties));
        }
      } else {
        console.log(`SIS-DP GetFeatureInfo -> Status: ${gfiRes.status}, Content-Type: ${gfiCt}`);
      }
    } catch (err) {
      console.log(`SIS-DP GetFeatureInfo -> Error: ${err.message}`);
    }
  }
}

checkDistricts().catch(console.error);
