import { createClient } from "@libsql/client";
import path from "path";
import { hashPassword } from "../services/auth";

const dbPath = path.resolve(process.cwd(), "nirnaya.db");
const client = createClient({ url: `file:${dbPath}` });

async function main() {
  console.log("Creating tables in", dbPath);

  // 1. Evidence Table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS evidence (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      authority TEXT NOT NULL,
      year INTEGER NOT NULL,
      geography TEXT NOT NULL,
      state TEXT,
      district TEXT,
      score INTEGER NOT NULL,
      summary TEXT NOT NULL,
      tags TEXT NOT NULL,
      source_url TEXT NOT NULL,
      checksum TEXT NOT NULL,
      provenance_date TEXT NOT NULL,
      verified INTEGER NOT NULL DEFAULT 1,
      citation TEXT,
      methodology_note TEXT
    );
  `);

  // 2. Policy Studies Table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS policy_studies (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      state TEXT NOT NULL,
      district TEXT,
      stage TEXT NOT NULL,
      stage_key TEXT NOT NULL,
      readiness_score INTEGER NOT NULL,
      owner TEXT NOT NULL,
      summary TEXT NOT NULL,
      priority TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // 3. Districts Table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS districts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      state TEXT NOT NULL,
      area_sq_km INTEGER NOT NULL,
      composite_risk INTEGER NOT NULL,
      risk_level TEXT NOT NULL,
      groundwater_stress INTEGER NOT NULL,
      built_up_expansion INTEGER NOT NULL,
      livelihood_sensitivity INTEGER NOT NULL,
      data_completeness INTEGER NOT NULL,
      land_dispute_intensity INTEGER NOT NULL,
      datasets_combined INTEGER NOT NULL DEFAULT 5,
      key_sources TEXT NOT NULL,
      notes TEXT,
      svg_region_class TEXT
    );
  `);

  // 4. Connectors Table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS connectors (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      owner TEXT NOT NULL,
      status TEXT NOT NULL,
      governance_status TEXT NOT NULL,
      purpose TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      refresh TEXT NOT NULL,
      auth_type TEXT NOT NULL,
      documentation_url TEXT,
      contract_details TEXT NOT NULL
    );
  `);

  // 5. Scenario Runs Table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS scenario_runs (
      id TEXT PRIMARY KEY,
      study_id TEXT,
      geography_id TEXT,
      conservation INTEGER NOT NULL,
      livelihood INTEGER NOT NULL,
      feasibility INTEGER NOT NULL,
      water INTEGER NOT NULL,
      score INTEGER NOT NULL,
      method TEXT NOT NULL,
      recommendation TEXT NOT NULL,
      impacts TEXT NOT NULL,
      assumptions TEXT NOT NULL,
      evidence_snapshot TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  // 6. Dashboard Metrics Table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS dashboard_metrics (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      delta TEXT NOT NULL,
      label TEXT NOT NULL,
      tone TEXT NOT NULL,
      sort_order INTEGER NOT NULL
    );
  `);

  // 7. Users Table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'Policy Analyst',
      created_at TEXT NOT NULL
    );
  `);

  // 8. Sessions Table
  await client.execute(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  console.log("Tables verified. Clearing existing records for clean seeding...");
  await client.execute("DELETE FROM evidence;");
  await client.execute("DELETE FROM policy_studies;");
  await client.execute("DELETE FROM districts;");
  await client.execute("DELETE FROM connectors;");
  await client.execute("DELETE FROM dashboard_metrics;");
  await client.execute("DELETE FROM sessions;");
  await client.execute("DELETE FROM users;");


  console.log("Seeding evidence...");
  const evidenceRecords = [
    {
      id: "ev-001",
      title: "Guidance for planned peri-urban land transitions",
      type: "Policy",
      authority: "Department of Land Resources",
      year: 2025,
      geography: "India",
      state: "National",
      district: "All",
      score: 96,
      summary: "A statutory policy framework for coordinating conversion controls, service planning and protection of high-value agricultural land around expanding tier-1 and tier-2 cities.",
      tags: JSON.stringify(["peri-urban", "land conversion", "planning", "buffer zones"]),
      source_url: "https://dolr.gov.in",
      checksum: "sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
      provenance_date: "2026-09-15",
      verified: 1,
      citation: "DoLR Policy Guidance Circular No. 14/2025 on Agricultural Land Safeguards.",
      methodology_note: "Empirical review of 28 municipal fringe master plans across 8 states."
    },
    {
      id: "ev-002",
      title: "Groundwater stress and built-up expansion in the Chennai metropolitan fringe",
      type: "Research",
      authority: "National Institute of Urban Affairs",
      year: 2024,
      geography: "Tamil Nadu",
      state: "Tamil Nadu",
      district: "Chennai, Kancheepuram, Tiruvallur",
      score: 93,
      summary: "Spatial econometrics identifies strong correlation between unplanned built-up growth, impermeable surface sprawl, and critical aquifer drawdowns in fringe taluks.",
      tags: JSON.stringify(["groundwater", "urban growth", "Chennai", "Kancheepuram", "aquifer"]),
      source_url: "https://niua.in",
      checksum: "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      provenance_date: "2026-08-20",
      verified: 1,
      citation: "NIUA Research Monograph Series 2024, Vol 8(3), pp. 112-135.",
      methodology_note: "Multi-temporal Landsat/Sentinel-2 LULC paired with CGWB observation well hydrographs (2014-2024)."
    },
    {
      id: "ev-003",
      title: "District groundwater assessment: Kancheepuram and Chengalpattu",
      type: "Dataset",
      authority: "Central Ground Water Board",
      year: 2024,
      geography: "Kancheepuram",
      state: "Tamil Nadu",
      district: "Kancheepuram",
      score: 91,
      summary: "Block-level dynamic groundwater resource categorization, annual extraction estimates, and recharge deficit observations for regional spatial planning.",
      tags: JSON.stringify(["water stress", "CGWB", "district indicators", "over-exploited"]),
      source_url: "https://cgwb.gov.in",
      checksum: "sha256:ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb",
      provenance_date: "2026-07-10",
      verified: 1,
      citation: "CGWB National Dynamic Ground Water Resources Assessment Report 2024.",
      methodology_note: "Water-table fluctuation and groundwater estimation committee (GEC-2015) norms."
    },
    {
      id: "ev-004",
      title: "Tamil Nadu land-use and land-cover change atlas (2015-2023)",
      type: "Dataset",
      authority: "NRSC / State Remote Sensing Centre",
      year: 2023,
      geography: "Tamil Nadu",
      state: "Tamil Nadu",
      district: "Statewide",
      score: 88,
      summary: "1:50,000 scale land-cover classification tracking conversion of double-cropped wetland to commercial logistics and housing parcels.",
      tags: JSON.stringify(["remote sensing", "land cover", "GIS", "NRSC", "Bhuvan"]),
      source_url: "https://bhuvan.nrsc.gov.in",
      checksum: "sha256:4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a",
      provenance_date: "2026-06-01",
      verified: 1,
      citation: "ISRO/NRSC Geospatial Atlas Product ID: TN-LULC-50K-V3.",
      methodology_note: "Automated random forest classification validated with 2,400 field ground-truth points."
    },
    {
      id: "ev-005",
      title: "Model provisions for transferable development rights and agricultural buffers",
      type: "Legal",
      authority: "Ministry of Housing and Urban Affairs",
      year: 2022,
      geography: "India",
      state: "National",
      district: "Urban fringe",
      score: 84,
      summary: "National guidance on compensatory TDR mechanisms to protect sensitive water catchment basins and food-producing agricultural corridors without compulsory acquisition.",
      tags: JSON.stringify(["TDR", "legal", "urban policy", "agricultural buffer", "MoHUA"]),
      source_url: "https://mohua.gov.in",
      checksum: "sha256:ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d",
      provenance_date: "2026-05-18",
      verified: 1,
      citation: "MoHUA Advisory Note on Value Capture Financing & TDR Frameworks.",
      methodology_note: "Comparative legal analysis of state town planning enactments in 12 states."
    },
    {
      id: "ev-006",
      title: "Social safeguards and livelihood continuity in land pooling schemes",
      type: "Research",
      authority: "Indian Institute for Human Settlements",
      year: 2024,
      geography: "Multiple states",
      state: "Multiple",
      district: "Urban fringes",
      score: 82,
      summary: "Comprehensive comparative evaluation of consent rates, tenant farmer compensation, and employment continuity under modern land readjustment frameworks.",
      tags: JSON.stringify(["livelihood", "equity", "land pooling", "compensation", "IIHS"]),
      source_url: "https://iihs.co.in",
      checksum: "sha256:8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4",
      provenance_date: "2026-04-12",
      verified: 1,
      citation: "IIHS Land Governance Working Paper No. 44 (2024).",
      methodology_note: "Surveys of 1,840 landholders and 920 agricultural workers in peri-urban schemes."
    },
    {
      id: "ev-007",
      title: "Bhu-Aadhaar / ULPIN Implementation Progress and Cadastral Boundary Standard",
      type: "Policy",
      authority: "Department of Land Resources",
      year: 2024,
      geography: "India",
      state: "National",
      district: "All",
      score: 95,
      summary: "Operational technical specifications for Unique Land Parcel Identification Number (ULPIN) georeferencing, polygon validation, and integration with state registration databases.",
      tags: JSON.stringify(["ULPIN", "Bhu-Aadhaar", "cadastral", "DILRMP", "survey"]),
      source_url: "https://dolr.gov.in/dilrmp",
      checksum: "sha256:d4735e3a265e16eee03f59718b9b5d03019c07d8b6c51f90da3a666eec13ab35",
      provenance_date: "2026-09-01",
      verified: 1,
      citation: "DoLR Technical Standard TS-ULPIN-2024-V2.1.",
      methodology_note: "WGS-84 coordinate grid based standard using Open Location Code derivatives."
    },
    {
      id: "ev-008",
      title: "Common Property Resource (CPR) restoration in semiarid agroecological zones",
      type: "Research",
      authority: "NITI Aayog Land Governance Cell",
      year: 2025,
      geography: "Madhya Pradesh & Rajasthan",
      state: "Madhya Pradesh",
      district: "Dhar, Jhabua, Ratlam",
      score: 87,
      summary: "Case documentation showing how community-managed pastureland and water commons regeneration increases household resilience and reduces rural distress migration.",
      tags: JSON.stringify(["commons", "CPR", "grazing land", "restoration", "community tenure"]),
      source_url: "https://niti.gov.in",
      checksum: "sha256:4e07408562bedb8b60ce05c1decfe3ad16b72230967de01f640b7e4729b49fce",
      provenance_date: "2026-08-05",
      verified: 1,
      citation: "NITI Aayog Policy Synthesis Report 2025/11.",
      methodology_note: "Quasi-experimental impact evaluation over 45 Gram Panchayats."
    },
    {
      id: "ev-009",
      title: "Legal frameworks for resolving revenue boundary and title disputes in suburban clusters",
      type: "Legal",
      authority: "Law Commission / National Judicial Academy",
      year: 2023,
      geography: "India",
      state: "National",
      district: "Suburban",
      score: 85,
      summary: "Analysis of pendency in revenue courts, recommending fast-track mediation, digital evidence admissibility, and administrative demarcation standards.",
      tags: JSON.stringify(["disputes", "litigation", "revenue courts", "title dispute", "legal reform"]),
      source_url: "https://lawcommissionofindia.nic.in",
      checksum: "sha256:4b43b0aee35624cd95b910189b3dc2312fa6c6ab4a145f09ab5164f7626359f1",
      provenance_date: "2026-03-22",
      verified: 1,
      citation: "Law Commission Recommendation Note on Title Certainty in Developing Peripheries.",
      methodology_note: "Analysis of 14,000 revenue appeals across 6 High Court jurisdictions."
    },
    {
      id: "ev-010",
      title: "National Water Basin Vulnerability Index and Runoff Retention Atlas",
      type: "Dataset",
      authority: "Central Water Commission / India-WRIS",
      year: 2024,
      geography: "Southern Peninsular River Basins",
      state: "Tamil Nadu, Andhra Pradesh, Karnataka",
      district: "Palar, Cauvery, Pennar basins",
      score: 89,
      summary: "Sub-basin runoff vulnerability, tank storage siltation indexes, and hydrological sensitivity scores to guide peri-urban conversion denial zones.",
      tags: JSON.stringify(["WRIS", "hydrology", "water basin", "flood risk", "runoff"]),
      source_url: "https://indiawris.gov.in",
      checksum: "sha256:fbc71094191c9f2b6807cb67fed042ff14138e3e4a30ffb76258ed689cfba201",
      provenance_date: "2026-07-28",
      verified: 1,
      citation: "India-WRIS Geospatial Hydrology Atlas 2024.",
      methodology_note: "Integration of 30-year rainfall gridded data with SRTM DEM hydro-flow routing."
    }
  ];

  for (const item of evidenceRecords) {
    await client.execute({
      sql: `INSERT INTO evidence (id, title, type, authority, year, geography, state, district, score, summary, tags, source_url, checksum, provenance_date, verified, citation, methodology_note)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      args: [
        item.id, item.title, item.type, item.authority, item.year, item.geography,
        item.state, item.district, item.score, item.summary, item.tags, item.source_url,
        item.checksum, item.provenance_date, item.verified, item.citation, item.methodology_note
      ]
    });
  }

  console.log("Seeding policy studies...");
  const studies = [
    {
      id: "ps-001",
      title: "Peri-urban land conversion safeguards",
      state: "Tamil Nadu",
      district: "Kancheepuram & Tiruvallur",
      stage: "Evidence review",
      stage_key: "evidence_review",
      readiness_score: 78,
      owner: "DoLR Policy Cell",
      summary: "Establishing buffer zones around sensitive irrigation tanks and agricultural lands to prevent uncoordinated real estate conversion in the Chennai metro periphery.",
      priority: "High",
      created_at: "2026-02-10",
      updated_at: "2026-09-18"
    },
    {
      id: "ps-002",
      title: "Groundwater-sensitive zoning framework",
      state: "Rajasthan",
      district: "Jaipur & Jodhpur",
      stage: "Scenario testing",
      stage_key: "scenario_testing",
      readiness_score: 64,
      owner: "State Land Policy Unit",
      summary: "Linking industrial land mutation permissions directly to block-level CGWB groundwater recharge classifications and water recycling commitments.",
      priority: "Critical",
      created_at: "2026-03-14",
      updated_at: "2026-09-20"
    },
    {
      id: "ps-003",
      title: "Common land restoration guidelines",
      state: "Madhya Pradesh",
      district: "Dhar & Jhabua",
      stage: "Draft synthesis",
      stage_key: "draft_synthesis",
      readiness_score: 86,
      owner: "Land Resources Lab",
      summary: "Standard operating procedures for demarcation, removal of encroachments, and participatory agro-forestry tenure on rural gram sabha pastures.",
      priority: "Medium",
      created_at: "2026-01-20",
      updated_at: "2026-09-12"
    },
    {
      id: "ps-004",
      title: "Digital Cadastral Survey & ULPIN Integration",
      state: "Maharashtra",
      district: "Pune & Thane",
      stage: "Pilot implementation",
      stage_key: "pilot_implementation",
      readiness_score: 92,
      owner: "Settlement Commissionerate",
      summary: "Drone-based resurvey and Bhu-Aadhaar generation to resolve suburban boundary overlaps in rapidly industrializing corridors.",
      priority: "High",
      created_at: "2025-11-05",
      updated_at: "2026-09-19"
    }
  ];

  for (const s of studies) {
    await client.execute({
      sql: `INSERT INTO policy_studies (id, title, state, district, stage, stage_key, readiness_score, owner, summary, priority, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      args: [s.id, s.title, s.state, s.district, s.stage, s.stage_key, s.readiness_score, s.owner, s.summary, s.priority, s.created_at, s.updated_at]
    });
  }

  console.log("Seeding districts...");
  const districtRecords = [
    {
      id: "dist-kancheepuram",
      name: "Kancheepuram",
      state: "Tamil Nadu",
      area_sq_km: 4432,
      composite_risk: 72,
      risk_level: "High",
      groundwater_stress: 84,
      built_up_expansion: 71,
      livelihood_sensitivity: 62,
      data_completeness: 88,
      land_dispute_intensity: 68,
      datasets_combined: 5,
      key_sources: "CGWB, Census, NRSC LULC, State Revenue Dept, WRIS",
      notes: "High conversion of agricultural wetlands into industrial warehouses along NH-48. Severe groundwater over-exploitation in Sriperumbudur and Walajabad blocks.",
      svg_region_class: "r2"
    },
    {
      id: "dist-chennai",
      name: "Chennai",
      state: "Tamil Nadu",
      area_sq_km: 426,
      composite_risk: 86,
      risk_level: "Critical",
      groundwater_stress: 94,
      built_up_expansion: 92,
      livelihood_sensitivity: 48,
      data_completeness: 96,
      land_dispute_intensity: 82,
      datasets_combined: 6,
      key_sources: "Chennai Metrowater, CMDA GIS, CGWB, TN Registration Dept",
      notes: "Severe impermeability and critical aquifer stress. High land parcel mutation disputes in southern IT corridor extension.",
      svg_region_class: "r1"
    },
    {
      id: "dist-tiruvallur",
      name: "Tiruvallur",
      state: "Tamil Nadu",
      area_sq_km: 3422,
      composite_risk: 58,
      risk_level: "Moderate",
      groundwater_stress: 67,
      built_up_expansion: 54,
      livelihood_sensitivity: 74,
      data_completeness: 82,
      land_dispute_intensity: 51,
      datasets_combined: 4,
      key_sources: "CGWB, Agriculture Census, NRSC LULC, DoLR DILRMP",
      notes: "High concentration of smallholder farming. Moderate groundwater depletion, but accelerating peri-urban pressure around Gummidipoondi and Poonamallee.",
      svg_region_class: "r3"
    },
    {
      id: "dist-coimbatore",
      name: "Coimbatore",
      state: "Tamil Nadu",
      area_sq_km: 4723,
      composite_risk: 65,
      risk_level: "Moderate",
      groundwater_stress: 76,
      built_up_expansion: 68,
      livelihood_sensitivity: 58,
      data_completeness: 90,
      land_dispute_intensity: 60,
      datasets_combined: 5,
      key_sources: "CGWB, TNSDMA, Bhuvan, State Land Records",
      notes: "Western ghats foothills ecological sensitivity paired with rapid industrial corridor expansion along Avinashi road.",
      svg_region_class: "r1"
    },
    {
      id: "dist-pune",
      name: "Pune",
      state: "Maharashtra",
      area_sq_km: 15643,
      composite_risk: 75,
      risk_level: "High",
      groundwater_stress: 79,
      built_up_expansion: 85,
      livelihood_sensitivity: 65,
      data_completeness: 91,
      land_dispute_intensity: 78,
      datasets_combined: 6,
      key_sources: "PMRDA, Mahabhulekh, GSDA, NRSC",
      notes: "Rapid ring road land pooling conflicts, agricultural conversion around Haveli and Mulshi taluks.",
      svg_region_class: "r2"
    },
    {
      id: "dist-jaipur",
      name: "Jaipur",
      state: "Rajasthan",
      area_sq_km: 11152,
      composite_risk: 81,
      risk_level: "Critical",
      groundwater_stress: 96,
      built_up_expansion: 74,
      livelihood_sensitivity: 70,
      data_completeness: 85,
      land_dispute_intensity: 73,
      datasets_combined: 5,
      key_sources: "CGWB, Apna Khata, JDA, Watershed Dept",
      notes: "Over-exploited groundwater blocks across 85% of district area; high rural pasture encroachment.",
      svg_region_class: "r1"
    }
  ];

  for (const d of districtRecords) {
    await client.execute({
      sql: `INSERT INTO districts (id, name, state, area_sq_km, composite_risk, risk_level, groundwater_stress, built_up_expansion, livelihood_sensitivity, data_completeness, land_dispute_intensity, datasets_combined, key_sources, notes, svg_region_class)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      args: [
        d.id, d.name, d.state, d.area_sq_km, d.composite_risk, d.risk_level,
        d.groundwater_stress, d.built_up_expansion, d.livelihood_sensitivity,
        d.data_completeness, d.land_dispute_intensity, d.datasets_combined,
        d.key_sources, d.notes, d.svg_region_class
      ]
    });
  }

  console.log("Seeding connectors with honest government governance statuses...");
  const connectorRecords = [
    {
      id: "ogd",
      name: "Open Government Data",
      owner: "data.gov.in (NIC)",
      status: "live",
      governance_status: "Adapter ready",
      purpose: "Public socioeconomic, agricultural census, and administrative datasets used for national dashboard indicators.",
      endpoint: "/api/v1/adapters/ogd",
      refresh: "Daily catalogue sync",
      auth_type: "Open Public API",
      documentation_url: "https://data.gov.in/developer-api",
      contract_details: JSON.stringify({
        protocol: "REST / JSON",
        legal_basis: "National Data Sharing and Accessibility Policy (NDSAP)",
        data_sensitivity: "Public (Unrestricted)",
        sla: "99.2% Uptime",
        endpoints: [
          { path: "/api/v1/adapters/ogd/catalog", method: "GET", description: "Query land-use dataset catalog" },
          { path: "/api/v1/adapters/ogd/indicators", method: "GET", description: "Fetch district agricultural census metrics" }
        ],
        sample_query: "?resource_id=agri-census-2021&district=Kancheepuram"
      })
    },
    {
      id: "openalex",
      name: "OpenAlex Research Discovery",
      owner: "OurResearch",
      status: "live",
      governance_status: "Adapter ready",
      purpose: "Scholarly research discovery metadata, peer-reviewed land governance papers, authorship, and citation graphs.",
      endpoint: "/api/v1/adapters/openalex",
      refresh: "Weekly metadata sync",
      auth_type: "Open Access REST API",
      documentation_url: "https://docs.openalex.org",
      contract_details: JSON.stringify({
        protocol: "REST / JSON",
        legal_basis: "CC0 Open Data",
        data_sensitivity: "Public Academic",
        sla: "99.9% Uptime",
        endpoints: [
          { path: "/api/v1/adapters/openalex/search", method: "GET", description: "Search peer-reviewed land policy literature" }
        ],
        sample_query: "https://api.openalex.org/works?filter=default.search:land%20tenure%20india"
      })
    },
    {
      id: "bhuvan",
      name: "Bhuvan / NRSC Geospatial Portal",
      owner: "ISRO / NRSC",
      status: "sandbox",
      governance_status: "Sandbox",
      purpose: "Verified spatial layers for land use land cover (LULC), surface water bodies, wasteland mapping, and satellite indices.",
      endpoint: "/api/v1/adapters/bhuvan",
      refresh: "Seasonal / Dataset dependent",
      auth_type: "Spatial WMS / WFS (Open Geoportal)",
      documentation_url: "https://bhuvan.nrsc.gov.in",
      contract_details: JSON.stringify({
        protocol: "OGC WMS 1.3.0 / GeoJSON",
        legal_basis: "National Geospatial Policy 2022",
        data_sensitivity: "Open Geospatial / High-res restricted",
        sla: "Sandbox demonstration instance",
        endpoints: [
          { path: "/api/v1/adapters/bhuvan/lulc", method: "GET", description: "Retrieve district LULC polygon layers" },
          { path: "/api/v1/adapters/bhuvan/water-bodies", method: "GET", description: "Surface water spread time-series" }
        ],
        sample_query: "?layer=tn_lulc_50k&bbox=79.5,12.5,80.3,13.2"
      })
    },
    {
      id: "dilrmp",
      name: "DILRMP / ULPIN (Bhu-Aadhaar)",
      owner: "Department of Land Resources (MoRD)",
      status: "planned",
      governance_status: "Approval required",
      purpose: "Cadastral survey boundaries, parcel mutation records, and Bhu-Aadhaar 14-digit geo-coordinates.",
      endpoint: "/api/v1/adapters/dilrmp",
      refresh: "Real-time mutation stream",
      auth_type: "Inter-Departmental PKI & OAuth2 Token",
      documentation_url: "https://dolr.gov.in/dilrmp-api-spec",
      contract_details: JSON.stringify({
        protocol: "REST with Mutual TLS (mTLS)",
        legal_basis: "Official Secrets Act / Digital Personal Data Protection Act / MoRD Authorization",
        data_sensitivity: "Restricted Government Administrative",
        sla: "Awaiting State-DoLR Gateway Signoff",
        endpoints: [
          { path: "/api/v1/adapters/dilrmp/parcel/verify", method: "POST", description: "ULPIN parcel status verification" },
          { path: "/api/v1/adapters/dilrmp/mutation-stats", method: "GET", description: "Aggregated district mutation pendency" }
        ],
        prerequisites: "1. Security Clearance Certificate\n2. Signed MoU between Department and State Revenue Board\n3. Static IP whitelisting on NIC API Gateway"
      })
    },
    {
      id: "tinai",
      name: "TiNAI State Analytical Engine",
      owner: "Government of Tamil Nadu",
      status: "planned",
      governance_status: "Approval required",
      purpose: "State-specific analytical AI models, crop area estimates, and localized land acquisition risk evaluations.",
      endpoint: "/api/v1/adapters/tinai",
      refresh: "Bi-weekly batch analytics",
      auth_type: "State Inter-Departmental Token",
      documentation_url: "https://tn.gov.in/tinai",
      contract_details: JSON.stringify({
        protocol: "gRPC / REST JSON",
        legal_basis: "TNeGA State Inter-Departmental Data Agreement",
        data_sensitivity: "Confidential / State Policy Evaluation",
        sla: "Pending Inter-Agency Data Contract",
        endpoints: [
          { path: "/api/v1/adapters/tinai/conversion-risk", method: "POST", description: "Compute localized conversion risk score" }
        ],
        prerequisites: "1. Approval from Tamil Nadu e-Governance Agency (TNeGA)\n2. Revenue Department clearance for cadastral overlay"
      })
    },
    {
      id: "wris",
      name: "India-WRIS / CGWB Water Portal",
      owner: "Central Water Commission & CGWB",
      status: "sandbox",
      governance_status: "Sandbox",
      purpose: "Block-level dynamic groundwater assessment, aquifer stress ratings, and water table fluctuation trends.",
      endpoint: "/api/v1/adapters/wris",
      refresh: "Annual assessment snapshot",
      auth_type: "Public REST API",
      documentation_url: "https://indiawris.gov.in",
      contract_details: JSON.stringify({
        protocol: "REST / JSON",
        legal_basis: "National Water Policy",
        data_sensitivity: "Public Environmental Assessment",
        sla: "98.5% Uptime",
        endpoints: [
          { path: "/api/v1/adapters/wris/aquifer-status", method: "GET", description: "Get block groundwater categorization (Safe/Critical/Over-exploited)" }
        ],
        sample_query: "?state=Tamil+Nadu&district=Kancheepuram"
      })
    }
  ];

  for (const c of connectorRecords) {
    await client.execute({
      sql: `INSERT INTO connectors (id, name, owner, status, governance_status, purpose, endpoint, refresh, auth_type, documentation_url, contract_details)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      args: [
        c.id, c.name, c.owner, c.status, c.governance_status, c.purpose,
        c.endpoint, c.refresh, c.auth_type, c.documentation_url, c.contract_details
      ]
    });
  }

  console.log("Seeding dashboard metrics...");
  const metrics = [
    { key: "evidence_assets", value: "18,742", delta: "+286 this month", label: "Evidence assets", tone: "blue", sort_order: 1 },
    { key: "active_studies", value: "38", delta: "11 awaiting review", label: "Active policy studies", tone: "saffron", sort_order: 2 },
    { key: "districts_covered", value: "412", delta: "54% national coverage", label: "Districts covered", tone: "green", sort_order: 3 },
    { key: "verified_sources", value: "91.6%", delta: "Provenance complete", label: "Verified sources", tone: "navy", sort_order: 4 }
  ];

  for (const m of metrics) {
    await client.execute({
      sql: `INSERT INTO dashboard_metrics (key, value, delta, label, tone, sort_order)
            VALUES (?, ?, ?, ?, ?, ?);`,
      args: [m.key, m.value, m.delta, m.label, m.tone, m.sort_order]
    });
  }

  console.log("Seeding default authenticated users...");
  const defaultUsers = [
    {
      id: "usr-analyst-001",
      fullName: "S. Sathiyan",
      email: "analyst@dolr.gov.in",
      password: "Nirnaya@2026",
      role: "Policy Analyst",
    },
    {
      id: "usr-admin-001",
      fullName: "Dr. Rajesh Verma",
      email: "admin@dolr.gov.in",
      password: "Admin@Nirnaya2026",
      role: "Administrator",
    },
    {
      id: "usr-researcher-001",
      fullName: "Dr. Ananya Sen",
      email: "researcher@iihs.ac.in",
      password: "Research@2026",
      role: "Researcher",
    },
  ];

  for (const u of defaultUsers) {
    const passwordHash = hashPassword(u.password);
    await client.execute({
      sql: `INSERT INTO users (id, full_name, email, password_hash, role, created_at)
            VALUES (?, ?, ?, ?, ?, ?);`,
      args: [u.id, u.fullName, u.email, passwordHash, u.role, new Date().toISOString()]
    });
  }

  console.log("Seed completed successfully!");
}

main().catch(err => {
  console.error("Seed failed:", err);
  process.exit(1);
});
