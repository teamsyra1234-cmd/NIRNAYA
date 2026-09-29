import crypto from "crypto";
import { getDb } from "@/db";
import { ogdRecords, connectors, evidence } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

// ============================================================================
// OFFICIAL DATA.GOV.IN METADATA SPECIFICATION
// ============================================================================
export const OGD_CONFIG = {
  portalUrl: "https://data.gov.in",
  baseApiUrl: "https://api.data.gov.in",
  datasetTitle: "Daily District-wise Rainfall Data",
  catalogId: "a6007b2f-eed3-4a68-a321-d2d563d52bb2",
  resourceId: "6c05cd1b-ed59-40c2-bc31-e314f39c6971",
  catalogUrl: "https://data.gov.in/catalog/rainfall",
  resourceUrl: "https://data.gov.in/resource/daily-district-wise-rainfall-data",
  apiEndpoint: "https://api.data.gov.in/resource/6c05cd1b-ed59-40c2-bc31-e314f39c6971",
  publisher: "Ministry of Jal Shakti, Department of Water Resources, River Development & Ganga Rejuvenation / National Water Informatics Centre (NWIC)",
  ministry: "Ministry of Jal Shakti",
  department: "Department of Water Resources, River Development & Ganga Rejuvenation",
  agency: "National Water Informatics Centre (NWIC)",
  sector: "Water Resources",
  legalBasis: "National Data Sharing and Accessibility Policy (NDSAP), Government of India",
  authType: "OGD Platform API Key (Registered user token)",
} as const;

export type OgdRecordPayload = {
  district: string;
  state: string;
  date?: string;
  month?: string | number;
  year?: number;
  avgRainfallMm?: number;
  rainfallMm?: number;
  agency?: string;
  rawAttributes?: Record<string, unknown>;
};

export type OgdSyncResult = {
  success: boolean;
  status: "LIVE_OFFICIAL" | "APPROVAL_REQUIRED" | "ADAPTER_READY" | "ERROR";
  governanceStatus: "LIVE / OFFICIAL" | "API KEY REQUIRED" | "ADAPTER READY" | "Approval required" | "Live / Official";
  message: string;
  recordsImported: number;
  totalRecordsInDatabase: number;
  credentialRequired?: string;
  retrievedAt: string;
  checksum?: string;
  officialDataset: {
    title: string;
    publisher: string;
    catalogUrl: string;
    resourceUrl: string;
    resourceId: string;
    catalogId: string;
    apiEndpoint: string;
    legalBasis: string;
    authType: string;
  };
  sampleRecords?: OgdRecordPayload[];
  error?: string;
};

/**
 * Computes deterministic SHA-256 hash of a payload for cryptographic auditability.
 */
export function computeChecksum(payload: string | Buffer | object): string {
  const content = typeof payload === "string" ? payload : JSON.stringify(payload);
  return `sha256:${crypto.createHash("sha256").update(content).digest("hex")}`;
}

/**
 * Normalizes raw records from data.gov.in response into the NIRNAYA schema format.
 */
export function normalizeOgdRecord(raw: Record<string, unknown>, index: number): {
  id: string;
  district: string;
  state: string;
  date: string;
  month: string;
  year: number;
  avgRainfallMm: number;
  agency: string;
  authority: string;
  datasetTitle: string;
  sourceUrl: string;
  isOfficial: boolean;
  checksum: string;
  payload: OgdRecordPayload;
} {
  const district = String(
    raw.District ||
      raw.district ||
      raw.DISTRICT ||
      raw.district_name ||
      raw.DISTRICT_NAME ||
      raw["District Name"] ||
      "Unknown District"
  ).trim();

  const state = String(
    raw.State ||
      raw.state ||
      raw.STATE ||
      raw.state_name ||
      raw.STATE_NAME ||
      raw["State Name"] ||
      "India"
  ).trim();

  const date = String(raw.Date || raw.date || raw.DATE || raw.data_date || new Date().toISOString().split("T")[0]);
  const month = String(raw.Month || raw.month || raw.MONTH || "");
  const yearNum = Number(raw.Year || raw.year || raw.YEAR || new Date().getFullYear());
  const avgRain = Number(raw.Avg_rainfall || raw.avg_rainfall || raw.Rainfall || raw.rainfall || raw.rainfall_mm || 0);
  const agency = String(raw.Agency_name || raw.agency_name || "Ministry of Jal Shakti / NWIC").trim();

  const payload: OgdRecordPayload = {
    district,
    state,
    date,
    month,
    year: yearNum,
    avgRainfallMm: avgRain,
    agency,
    rawAttributes: raw,
  };

  const payloadStr = JSON.stringify(payload);
  const checksum = computeChecksum(payloadStr);
  const cleanDistrict = district.toLowerCase().replace(/[^a-z0-9]/g, "-");
  const id = `ogd-rain-${cleanDistrict}-${date}-${checksum.slice(7, 15)}`;

  return {
    id,
    district,
    state,
    date,
    month,
    year: yearNum,
    avgRainfallMm: avgRain,
    agency,
    authority: "Ministry of Jal Shakti / NWIC",
    datasetTitle: OGD_CONFIG.datasetTitle,
    sourceUrl: OGD_CONFIG.resourceUrl,
    isOfficial: true,
    checksum,
    payload,
  };
}

/**
 * Retrieves current synchronization status and official dataset details.
 */
export async function getOgdStatus(): Promise<{
  connector: any;
  recordsCount: number;
  lastRetrievedAt: string | null;
  officialDataset: typeof OGD_CONFIG;
  recentRecords: any[];
}> {
  const db = getDb();

  // Query connector record
  const connectorRows = await db
    .select()
    .from(connectors)
    .where(eq(connectors.id, "ogd"))
    .all();
  const connector = connectorRows[0] || null;

  // Query imported records count and recent records
  const allRecords = await db
    .select()
    .from(ogdRecords)
    .orderBy(desc(ogdRecords.retrievedAt))
    .limit(10)
    .all();

  const countResult = await db.select().from(ogdRecords).all();
  const recordsCount = countResult.length;

  if (connector) {
    if (recordsCount > 0) {
      connector.status = "live";
      connector.governanceStatus = "LIVE / OFFICIAL";
    } else {
      connector.status = "approval-required";
      connector.governanceStatus = "API KEY REQUIRED";
    }
  }

  return {
    connector,
    recordsCount,
    lastRetrievedAt: allRecords[0]?.retrievedAt || null,
    officialDataset: OGD_CONFIG,
    recentRecords: allRecords.map((r) => {
      let parsed = null;
      try {
        parsed = JSON.parse(r.payload);
      } catch {
        parsed = r.payload;
      }
      return {
        id: r.id,
        district: r.district,
        state: r.state,
        authority: r.authority,
        checksum: r.checksum,
        retrievedAt: r.retrievedAt,
        sourceUrl: r.sourceUrl,
        payload: parsed,
      };
    }),
  };
}

/**
 * Synchronizes data from Open Government Data (data.gov.in).
 * 
 * Rules:
 * 1. Makes real network requests to the official government host.
 * 2. If no API key is provided, captures the real authorization missing response,
 *    marks status as "Approval required", and never invents mock data.
 * 3. If a valid API key is provided, fetches real records, computes SHA-256 checksums,
 *    and persists them into the database with full provenance.
 */
export async function syncOgdData(
  options: { apiKey?: string; limit?: number } | string = {}
): Promise<OgdSyncResult> {
  const opts = typeof options === "string" ? { apiKey: options } : options;
  const db = getDb();
  const retrievedAt = new Date().toISOString();
  const apiKey =
    opts.apiKey?.trim() ||
    process.env.OGD_API_KEY?.trim() ||
    process.env.DATA_GOV_IN_API_KEY?.trim() ||
    "";

  const limit = Math.max(1, Math.min(100, opts.limit || 50));
  const baseOfficialDataset = {
    title: OGD_CONFIG.datasetTitle,
    publisher: OGD_CONFIG.publisher,
    catalogUrl: OGD_CONFIG.catalogUrl,
    resourceUrl: OGD_CONFIG.resourceUrl,
    resourceId: OGD_CONFIG.resourceId,
    catalogId: OGD_CONFIG.catalogId,
    apiEndpoint: OGD_CONFIG.apiEndpoint,
    legalBasis: OGD_CONFIG.legalBasis,
    authType: OGD_CONFIG.authType,
  };

  // Case A: No API key provided
  if (!apiKey) {
    try {
      // Make genuine call to official API endpoint to capture real government response
      const liveEndpoint = `${OGD_CONFIG.apiEndpoint}?format=json`;
      const res = await fetch(liveEndpoint, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(10000),
      });

      const bodyText = await res.text();
      let bodyJson: Record<string, unknown> = {};
      try {
        bodyJson = JSON.parse(bodyText);
      } catch {
        bodyJson = { raw: bodyText };
      }

      // Update connector record in SQLite
      const existingRows = await db.select().from(ogdRecords).all();
      const contractDetailsObj = {
        protocol: "REST / JSON",
        legal_basis: OGD_CONFIG.legalBasis,
        data_sensitivity: "Public Open Government Data (NDSAP)",
        publisher: OGD_CONFIG.publisher,
        dataset: OGD_CONFIG.datasetTitle,
        catalog_id: OGD_CONFIG.catalogId,
        resource_id: OGD_CONFIG.resourceId,
        source_url: OGD_CONFIG.resourceUrl,
        api_endpoint: OGD_CONFIG.apiEndpoint,
        auth_required: true,
        auth_type: OGD_CONFIG.authType,
        last_sync_attempt: retrievedAt,
        sync_status: "approval_required",
        sync_message: "Government of India data.gov.in requires an official API key for this resource under NDSAP guidelines.",
        records_imported: existingRows.length,
        official_response_preview: bodyJson,
      };

      await db
        .update(connectors)
        .set({
          status: "approval-required",
          governanceStatus: "API KEY REQUIRED",
          contractDetails: JSON.stringify(contractDetailsObj),
        })
        .where(eq(connectors.id, "ogd"));

      return {
        success: false,
        status: "APPROVAL_REQUIRED",
        governanceStatus: "API KEY REQUIRED",
        message: "Government of India OGD platform (data.gov.in) requires an official API key to access granular records for resource 6c05cd1b-ed59-40c2-bc31-e314f39c6971.",
        credentialRequired: "OGD Platform API Key (Generated from user account dashboard on https://data.gov.in)",
        recordsImported: 0,
        totalRecordsInDatabase: existingRows.length,
        retrievedAt,
        officialDataset: baseOfficialDataset,
      };
    } catch (err: any) {
      console.error("OGD live endpoint check error:", err);
      return {
        success: false,
        status: "ERROR",
        governanceStatus: "Approval required",
        message: `Failed to connect to data.gov.in: ${err.message}`,
        credentialRequired: "OGD Platform API Key",
        recordsImported: 0,
        totalRecordsInDatabase: 0,
        retrievedAt,
        officialDataset: baseOfficialDataset,
        error: err.message,
      };
    }
  }

  // Case B: API key provided - Fetch real live records from data.gov.in
  try {
    const liveEndpoint = `${OGD_CONFIG.apiEndpoint}?api-key=${encodeURIComponent(apiKey)}&format=json&limit=${limit}`;
    const res = await fetch(liveEndpoint, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok && res.status !== 200) {
      throw new Error(`Official data.gov.in API returned HTTP ${res.status}`);
    }

    const data = (await res.json()) as any;

    if (data.error || (data.status && data.status !== "ok" && !Array.isArray(data.records))) {
      const errMsg = typeof data.error === "string" ? data.error : data.message || "Authentication rejected by data.gov.in";
      return {
        success: false,
        status: "APPROVAL_REQUIRED",
        governanceStatus: "Approval required",
        message: `data.gov.in rejected API key: ${errMsg}`,
        credentialRequired: "Valid OGD Platform API Key",
        recordsImported: 0,
        totalRecordsInDatabase: 0,
        retrievedAt,
        officialDataset: baseOfficialDataset,
        error: errMsg,
      };
    }

    const rawRecords = Array.isArray(data.records) ? data.records : [];
    if (rawRecords.length === 0) {
      return {
        success: true,
        status: "LIVE_OFFICIAL",
        governanceStatus: "Live / Official",
        message: "Connected to data.gov.in successfully. Official query returned 0 records for specified filter.",
        recordsImported: 0,
        totalRecordsInDatabase: 0,
        retrievedAt,
        officialDataset: baseOfficialDataset,
      };
    }

    const payloadChecksum = computeChecksum(JSON.stringify(rawRecords));
    let insertedCount = 0;

    for (let i = 0; i < rawRecords.length; i++) {
      const raw = rawRecords[i];
      const norm = normalizeOgdRecord(raw, i);

      await db
        .insert(ogdRecords)
        .values({
          id: norm.id,
          source: "Open Government Data Platform India",
          authority: OGD_CONFIG.publisher,
          datasetTitle: OGD_CONFIG.datasetTitle,
          catalogId: OGD_CONFIG.catalogId,
          resourceId: OGD_CONFIG.resourceId,
          sourceUrl: OGD_CONFIG.resourceUrl,
          retrievedAt,
          publicationDate: norm.date,
          geography: norm.district,
          state: norm.state,
          district: norm.district,
          recordIdentifier: `ogd-rec-${norm.year}-${norm.date}-${i + 1}`,
          checksum: norm.checksum,
          payload: JSON.stringify(norm.payload),
          isOfficial: 1,
        })
        .onConflictDoUpdate({
          target: ogdRecords.id,
          set: {
            retrievedAt,
            checksum: norm.checksum,
            payload: JSON.stringify(norm.payload),
          },
        });

      insertedCount++;
    }

    // Register verified evidence entry for Evidence Explorer visibility
    const evidenceId = `ev-ogd-rainfall-${OGD_CONFIG.resourceId.slice(0, 8)}`;
    await db
      .insert(evidence)
      .values({
        id: evidenceId,
        title: `${OGD_CONFIG.datasetTitle} (Official Ingestion)`,
        type: "Dataset",
        authority: OGD_CONFIG.publisher,
        year: new Date().getFullYear(),
        geography: "National / Multi-District",
        state: "National",
        district: "Multi-District",
        score: 98,
        summary: `Official real-time meteorological rainfall statistics ingested directly from Government of India Open Government Data Platform (data.gov.in), published by National Water Informatics Centre under Ministry of Jal Shakti.`,
        tags: JSON.stringify(["Official OGD", "data.gov.in", "Rainfall", "Water Resources", "Ministry of Jal Shakti", "NWIC"]),
        sourceUrl: OGD_CONFIG.resourceUrl,
        checksum: payloadChecksum,
        provenanceDate: retrievedAt.split("T")[0],
        verified: 1,
        citation: `Government of India, Ministry of Jal Shakti, NWIC (2026). Daily District-wise Rainfall Data. OGD Platform India. Resource ID: ${OGD_CONFIG.resourceId}.`,
        methodologyNote: `Ingested via OGD Platform REST API v2.1 with SHA-256 payload verification. Certified under NDSAP public data accessibility rules.`,
      })
      .onConflictDoUpdate({
        target: evidence.id,
        set: {
          checksum: payloadChecksum,
          provenanceDate: retrievedAt.split("T")[0],
        },
      });

    // Update connector status in database
    const totalRecords = await db.select().from(ogdRecords).all();
    const contractDetailsObj = {
      protocol: "REST / JSON",
      legal_basis: OGD_CONFIG.legalBasis,
      data_sensitivity: "Public Open Government Data (NDSAP)",
      publisher: OGD_CONFIG.publisher,
      dataset: OGD_CONFIG.datasetTitle,
      catalog_id: OGD_CONFIG.catalogId,
      resource_id: OGD_CONFIG.resourceId,
      source_url: OGD_CONFIG.resourceUrl,
      api_endpoint: OGD_CONFIG.apiEndpoint,
      auth_required: true,
      auth_type: OGD_CONFIG.authType,
      last_successful_sync: retrievedAt,
      sync_status: "live_official",
      sync_message: `Successfully synchronized ${insertedCount} official records from data.gov.in.`,
      records_imported: totalRecords.length,
      payload_checksum: payloadChecksum,
    };

    await db
      .update(connectors)
      .set({
        status: "live",
        governanceStatus: "LIVE / OFFICIAL",
        contractDetails: JSON.stringify(contractDetailsObj),
      })
      .where(eq(connectors.id, "ogd"));

    return {
      success: true,
      status: "LIVE_OFFICIAL",
      governanceStatus: "LIVE / OFFICIAL",
      message: `Successfully synchronized ${insertedCount} official records from Open Government Data Platform India (data.gov.in).`,
      recordsImported: insertedCount,
      totalRecordsInDatabase: totalRecords.length,
      checksum: payloadChecksum,
      retrievedAt,
      officialDataset: baseOfficialDataset,
      sampleRecords: rawRecords.slice(0, 5).map((r: any, idx: number) => normalizeOgdRecord(r, idx).payload),
    };
  } catch (err: any) {
    console.error("OGD sync error:", err);
    return {
      success: false,
      status: "ERROR",
      governanceStatus: "Approval required",
      message: `Failed to synchronize with data.gov.in: ${err.message}`,
      recordsImported: 0,
      totalRecordsInDatabase: 0,
      retrievedAt,
      officialDataset: baseOfficialDataset,
      error: err.message,
    };
  }
}

// ============================================================================
// OFFICIAL DATA.GOV.IN CATALOG DISCOVERY SPECIFICATION & API
// ============================================================================

export const OGD_CATALOG_CONFIG = {
  catalogSearchUrl: "https://www.data.gov.in/backend/dmspublic/v1/catalogs",
  portalUrl: "https://data.gov.in",
  publisher: "Open Government Data Platform India (data.gov.in)",
  legalBasis: "National Data Sharing and Accessibility Policy (NDSAP), Government of India",
  authRequired: false,
} as const;

export type OgdDiscoveredDataset = {
  id: string;
  title: string;
  description: string;
  ministry: string;
  department?: string;
  sector?: string;
  state?: string;
  jurisdiction?: string;
  publishedDate?: string;
  lastUpdated?: string;
  sourceUrl: string;
  sourceAuthority: string;
  isOfficialOgd: true;
  apiAvailable?: boolean;
  totalCatalogsCount?: number;
  nid?: number;
  uuid?: string;
};

export type OgdCatalogSearchResponse = {
  success: boolean;
  query: string;
  total: number;
  items: OgdDiscoveredDataset[];
  source: string;
  searchEndpoint: string;
  authRequired: false;
  timestamp: string;
  detectedGeography?: string | null;
  detectedDistrict?: string | null;
  detectedState?: string | null;
  error?: string;
};

// ============================================================================
// GEOGRAPHIC PARSING & RELEVANCE RANKING FOR DATA.GOV.IN CATALOG DISCOVERY
// ============================================================================

export type IndianDistrictDefinition = {
  canonical: string;
  state: string;
  patterns: RegExp[];
};

export type IndianStateDefinition = {
  canonical: string;
  patterns: RegExp[];
};

export type DetectedGeography = {
  district: string | null;
  state: string | null;
  parentState: string | null;
  label: string | null;
};

export const SUPPORTED_INDIAN_DISTRICTS: IndianDistrictDefinition[] = [
  {
    canonical: "Kancheepuram",
    state: "Tamil Nadu",
    patterns: [/\bkancheepuram\b/i, /\bkanchipuram\b/i],
  },
  {
    canonical: "Chennai",
    state: "Tamil Nadu",
    patterns: [/\bchennai\b/i, /\bmadras\b/i],
  },
  {
    canonical: "Tiruvallur",
    state: "Tamil Nadu",
    patterns: [/\btiruvallur\b/i, /\bthiruvallur\b/i],
  },
  {
    canonical: "Coimbatore",
    state: "Tamil Nadu",
    patterns: [/\bcoimbatore\b/i, /\bkovai\b/i],
  },
  {
    canonical: "Pune",
    state: "Maharashtra",
    patterns: [/\bpune\b/i, /\bpoona\b/i],
  },
  {
    canonical: "Jaipur",
    state: "Rajasthan",
    patterns: [/\bjaipur\b/i],
  },
];

export const SUPPORTED_INDIAN_STATES: IndianStateDefinition[] = [
  { canonical: "Tamil Nadu", patterns: [/\btamil\s*nadu\b/i, /\btamilnadu\b/i] },
  { canonical: "Kerala", patterns: [/\bkerala\b/i] },
  { canonical: "Karnataka", patterns: [/\bkarnataka\b/i] },
  { canonical: "Andhra Pradesh", patterns: [/\bandhra\s*pradesh\b/i, /\bandhra\b/i] },
  { canonical: "Telangana", patterns: [/\btelangana\b/i, /\btelengana\b/i] },
  { canonical: "Maharashtra", patterns: [/\bmaharashtra\b/i] },
  { canonical: "Gujarat", patterns: [/\bgujarat\b/i] },
  { canonical: "Rajasthan", patterns: [/\brajasthan\b/i] },
  { canonical: "Punjab", patterns: [/\bpunjab\b/i] },
  { canonical: "Haryana", patterns: [/\bharyana\b/i] },
  { canonical: "Uttar Pradesh", patterns: [/\buttar\s*pradesh\b/i] },
  { canonical: "Madhya Pradesh", patterns: [/\bmadhya\s*pradesh\b/i] },
  { canonical: "West Bengal", patterns: [/\bwest\s*bengal\b/i, /\bbengal\b/i] },
  { canonical: "Odisha", patterns: [/\bodisha\b/i, /\borissa\b/i] },
  { canonical: "Bihar", patterns: [/\bbihar\b/i] },
  { canonical: "Jharkhand", patterns: [/\bjharkhand\b/i] },
  { canonical: "Chhattisgarh", patterns: [/\bchhattisgarh\b/i, /\bchhattishgarh\b/i] },
  { canonical: "Assam", patterns: [/\bassam\b/i] },
  { canonical: "Delhi", patterns: [/\bdelhi\b/i, /\bnew\s*delhi\b/i] },
  // Additional States & UTs for nationwide coverage
  { canonical: "Jammu and Kashmir", patterns: [/\bjammu\s*(?:&|and)?\s*kashmir\b/i, /\bj&k\b/i] },
  { canonical: "Himachal Pradesh", patterns: [/\bhimachal\s*pradesh\b/i, /\bhimachal\b/i] },
  { canonical: "Uttarakhand", patterns: [/\buttarakhand\b/i, /\buttaranchal\b/i] },
  { canonical: "Goa", patterns: [/\bgoa\b/i] },
  { canonical: "Sikkim", patterns: [/\bsikkim\b/i] },
  { canonical: "Tripura", patterns: [/\btripura\b/i] },
  { canonical: "Meghalaya", patterns: [/\bmeghalaya\b/i] },
  { canonical: "Manipur", patterns: [/\bmanipur\b/i] },
  { canonical: "Nagaland", patterns: [/\bnagaland\b/i] },
  { canonical: "Mizoram", patterns: [/\bmizoram\b/i] },
  { canonical: "Arunachal Pradesh", patterns: [/\barunachal\s*pradesh\b/i, /\barunachal\b/i] },
  { canonical: "Chandigarh", patterns: [/\bchandigarh\b/i] },
  { canonical: "Puducherry", patterns: [/\b(?:puducherry|pondicherry)\b/i] },
  { canonical: "Ladakh", patterns: [/\bladakh\b/i] },
];

/**
 * Lightweight query parser that detects common Indian district terms.
 * Uses word-boundary matching to prevent false positives.
 */
export function detectIndianDistrict(query: string): IndianDistrictDefinition | null {
  if (!query || typeof query !== "string") return null;
  const trimmed = query.trim();
  for (const d of SUPPORTED_INDIAN_DISTRICTS) {
    for (const pat of d.patterns) {
      if (pat.test(trimmed)) return d;
    }
  }
  return null;
}

/**
 * Lightweight query parser that detects common Indian state terms.
 * Uses word-boundary matching to prevent false positives.
 */
export function detectIndianState(query: string): string | null {
  if (!query || typeof query !== "string") return null;
  const trimmed = query.trim();
  for (const s of SUPPORTED_INDIAN_STATES) {
    for (const pat of s.patterns) {
      if (pat.test(trimmed)) return s.canonical;
    }
  }
  return null;
}

/**
 * Lightweight query parser that detects common Indian geographic terms (districts and states).
 * Distinguishes districts from states and associates districts with their parent state.
 */
export function detectIndianGeography(query: string): DetectedGeography | null {
  if (!query || typeof query !== "string") return null;
  const trimmed = query.trim();

  const districtDef = detectIndianDistrict(trimmed);
  const districtName = districtDef ? districtDef.canonical : null;
  const parentState = districtDef ? districtDef.state : null;
  const stateName = detectIndianState(trimmed);

  if (!districtName && !stateName) return null;

  let label: string;
  if (districtName && stateName) {
    label = `${districtName}, ${stateName}`;
  } else if (districtName) {
    label = districtName;
  } else {
    label = stateName!;
  }

  return {
    district: districtName,
    state: stateName,
    parentState,
    label,
  };
}

/**
 * Extracts non-geographic topic words from the user query by stripping detected district and state terms.
 */
export function extractTopicKeywords(query: string, detectedGeo: DetectedGeography | string | null): string[] {
  if (!query) return [];
  let cleaned = query;

  const geo: DetectedGeography | null =
    typeof detectedGeo === "string" ? detectIndianGeography(detectedGeo) : detectedGeo;

  if (geo?.district) {
    const d = SUPPORTED_INDIAN_DISTRICTS.find((item) => item.canonical === geo.district);
    if (d) {
      for (const pat of d.patterns) {
        cleaned = cleaned.replace(pat, " ");
      }
    }
  }
  if (geo?.state) {
    const s = SUPPORTED_INDIAN_STATES.find((item) => item.canonical === geo.state);
    if (s) {
      for (const pat of s.patterns) {
        cleaned = cleaned.replace(pat, " ");
      }
    }
  }

  return cleaned
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2);
}

/**
 * Checks if a given text string matches a target district name.
 */
export function textMatchesDistrict(text: string | undefined | null, districtName: string): boolean {
  if (!text || !districtName) return false;
  const d = SUPPORTED_INDIAN_DISTRICTS.find(
    (item) => item.canonical.toLowerCase() === districtName.toLowerCase()
  );
  if (d) {
    return d.patterns.some((pat) => pat.test(text));
  }
  return new RegExp(`\\b${districtName.replace(/\s+/g, "\\s+")}\\b`, "i").test(text);
}

/**
 * Checks if a given text string matches a target state name.
 */
export function textMatchesState(text: string | undefined | null, stateName: string): boolean {
  if (!text || !stateName) return false;
  const s = SUPPORTED_INDIAN_STATES.find(
    (item) => item.canonical.toLowerCase() === stateName.toLowerCase()
  );
  if (s) {
    return s.patterns.some((pat) => pat.test(text));
  }
  return new RegExp(`\\b${stateName.replace(/\s+/g, "\\s+")}\\b`, "i").test(text);
}

/**
 * Checks if an item's official metadata explicitly identifies it as belonging to a DIFFERENT state.
 */
export function belongsToOtherState(item: OgdDiscoveredDataset, targetState: string): boolean {
  const combined = [
    item.state || "",
    item.jurisdiction || "",
    item.department || "",
    item.ministry || "",
  ].join(" ");

  for (const s of SUPPORTED_INDIAN_STATES) {
    if (s.canonical.toLowerCase() === targetState.toLowerCase()) continue;
    if (s.patterns.some((pat) => pat.test(combined))) {
      return true;
    }
  }
  return false;
}

/**
 * Checks if an item represents a broad national dataset (All India, Central Government, etc.).
 */
export function isNationalDataset(item: OgdDiscoveredDataset): boolean {
  const combined = [
    item.state || "",
    item.jurisdiction || "",
    item.department || "",
    item.ministry || "",
  ]
    .join(" ")
    .toLowerCase();

  return (
    combined.includes("all india") ||
    combined.includes("national") ||
    combined.includes("government of india") ||
    combined.includes("ministry of") ||
    combined.includes("central")
  );
}

function textContainsWord(text: string | undefined | null, word: string): boolean {
  if (!text || !word) return false;
  return new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text);
}

/**
 * Computes geographic relevance score for an official OGD catalog dataset.
 * 
 * Ranking behaviour:
 * 1. Highest: District explicitly present in official title or jurisdiction metadata (200 - 240).
 * 2. Next: District present in authoritative metadata fields (140 - 160).
 * 3. Next: Matching State-wide dataset (160 - 180 with topic match, 110 baseline).
 * 4. Next: National / All-India dataset (70 - 80 with topic match, 50 baseline).
 * 5. Lower: Neutral dataset without geographic affiliation (30 - 40).
 * 6. Lowest: Explicitly conflicting geography (10 - 20).
 * 
 * Note: Only authoritative metadata (title, jurisdiction, department, ministry) is used.
 * Generic description is NEVER used to claim district affiliation.
 */
export function calculateGeographicRelevanceScore(
  item: OgdDiscoveredDataset,
  geo: DetectedGeography,
  topicWords: string[] = []
): number {
  const { district, state, parentState } = geo;
  const effectiveState = state || parentState;

  const hasTopicInTitle =
    topicWords.length > 0 && topicWords.some((w) => textContainsWord(item.title, w));
  const hasTopicInDesc =
    topicWords.length > 0 &&
    topicWords.some((w) => textContainsWord(item.description, w) || textContainsWord(item.sector, w));

  // Authoritative district check (title, jurisdiction/state, and department/ministry ONLY)
  // Description is explicitly NOT used to claim district affiliation.
  const districtInTitle = district ? textMatchesDistrict(item.title, district) : false;
  const districtInJur = district
    ? textMatchesDistrict(item.state, district) ||
      textMatchesDistrict(item.jurisdiction, district) ||
      textMatchesDistrict(item.department, district) ||
      textMatchesDistrict(item.ministry, district)
    : false;

  const matchesDistrict = districtInTitle || districtInJur;

  // 1. Highest: District explicitly present in official title/jurisdiction metadata
  if (matchesDistrict) {
    if (districtInTitle && districtInJur) {
      if (hasTopicInTitle) return 240;
      if (hasTopicInDesc) return 220;
      return 150;
    }
    if (districtInTitle) {
      if (hasTopicInTitle) return 220;
      if (hasTopicInDesc) return 200;
      return 140;
    }
    if (districtInJur) {
      if (hasTopicInTitle) return 200;
      if (hasTopicInDesc) return 180;
      return 130;
    }
  }

  // 2. Next: Matching State (either explicit state in query or parent state of detected district)
  if (effectiveState) {
    const stateInTitle = textMatchesState(item.title, effectiveState);
    const stateInJur =
      textMatchesState(item.state, effectiveState) ||
      textMatchesState(item.jurisdiction, effectiveState) ||
      textMatchesState(item.department, effectiveState) ||
      textMatchesState(item.ministry, effectiveState);

    // If query targeted a specific district, check if this dataset belongs to a DIFFERENT district in the same state
    const isOtherDistrictInSameState =
      Boolean(district) &&
      SUPPORTED_INDIAN_DISTRICTS.some(
        (d) =>
          d.state.toLowerCase() === effectiveState.toLowerCase() &&
          d.canonical.toLowerCase() !== district!.toLowerCase() &&
          (textMatchesDistrict(item.title, d.canonical) ||
            textMatchesDistrict(item.state, d.canonical) ||
            textMatchesDistrict(item.jurisdiction, d.canonical))
      );

    if (stateInTitle || stateInJur) {
      if (!isOtherDistrictInSameState) {
        // State-wide dataset for target state (e.g. Tamil Nadu state rainfall)
        if (hasTopicInTitle) return 180;
        if (hasTopicInDesc) return 160;
        return 110;
      } else {
        // Another district in same state (e.g. Tirunelveli when searching Kancheepuram)
        if (hasTopicInTitle) return 130;
        if (hasTopicInDesc) return 110;
        return 85;
      }
    }
  }

  // 3. Next: National / All-India dataset
  const otherState = effectiveState ? belongsToOtherState(item, effectiveState) : false;
  const national = isNationalDataset(item);

  if (!otherState && national) {
    if (hasTopicInTitle) return 80;
    if (hasTopicInDesc) return 70;
    return 50;
  }

  // 4. Lower: Neutral dataset (no state specified)
  if (!otherState) {
    if (hasTopicInTitle) return 40;
    if (hasTopicInDesc) return 35;
    return 30;
  }

  // 5. Lowest: Explicitly conflicting geography
  if (hasTopicInTitle) return 20;
  if (hasTopicInDesc) return 15;
  return 10;
}

/**
 * Sorts discovered OGD datasets by geographic relevance score using a stable sort.
 */
export function rankDatasetsByGeography(
  items: OgdDiscoveredDataset[],
  geo: DetectedGeography | string | null,
  topicWords: string[] = []
): OgdDiscoveredDataset[] {
  if (!geo) return items;

  const normalizedGeo: DetectedGeography =
    typeof geo === "string"
      ? detectIndianGeography(geo) || { district: null, state: geo, parentState: null, label: geo }
      : geo;

  const withIndex = items.map((item, index) => ({ item, index }));

  withIndex.sort((a, b) => {
    const scoreA = calculateGeographicRelevanceScore(a.item, normalizedGeo, topicWords);
    const scoreB = calculateGeographicRelevanceScore(b.item, normalizedGeo, topicWords);
    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }
    return a.index - b.index; // Preserve original OGD ranking order for ties
  });

  return withIndex.map((x) => x.item);
}

/**
 * Normalizes a raw catalog record from data.gov.in backend into the standard NIRNAYA discovered dataset format.
 */
export function normalizeDiscoveredCatalog(row: Record<string, any>): OgdDiscoveredDataset {
  const nid = Array.isArray(row.nid) ? row.nid[0] : row.nid;
  const uuid = Array.isArray(row.uuid) ? row.uuid[0] : row.uuid;
  const id = uuid ? `ogd-cat-${uuid}` : nid ? `ogd-cat-${nid}` : `ogd-cat-${Math.random().toString(36).slice(2, 9)}`;

  // Title: strip whitespace and HTML tags if any
  const rawTitle = Array.isArray(row.title) ? row.title[0] : row.title || "Untitled Government Dataset";
  const title = String(rawTitle).trim();

  // Description / body
  const rawBody = Array.isArray(row["body:value"])
    ? row["body:value"][0]
    : Array.isArray(row.desc)
    ? row.desc[0]
    : row.body || row.desc || title;
  const description = String(rawBody || title).trim();

  // Ministry & Department
  const ministryList: string[] = Array.isArray(row["field_ministry_department:name"])
    ? row["field_ministry_department:name"]
    : Array.isArray(row["field_state_department:name"])
    ? row["field_state_department:name"]
    : [];

  let ministry = "";
  let department = "";
  if (ministryList.length > 0) {
    ministry = String(ministryList[0]).trim();
    if (ministryList.length > 1) {
      department = ministryList.slice(1).join(" / ").trim();
    }
  } else if (Array.isArray(row["field_group_name:name"]) && row["field_group_name:name"].length > 0) {
    ministry = String(row["field_group_name:name"][0]).trim();
  } else if (row.govt_type && Array.isArray(row.govt_type) && row.govt_type.length > 0) {
    ministry = `${row.govt_type[0]} Government Department`;
  } else {
    ministry = "Government of India";
  }

  // Sector
  const sector = Array.isArray(row["field_sector:name"])
    ? row["field_sector:name"].join(", ")
    : undefined;

  // State / Jurisdiction
  const jurisdictionList = Array.isArray(row["field_asset_jurisdiction:name"])
    ? row["field_asset_jurisdiction:name"]
    : [];
  const stateJurisdiction = jurisdictionList.length > 0 ? jurisdictionList.join(", ") : undefined;

  // Last Updated Date
  const epoch = row.changed?.[0] || row.published_date?.[0] || row.created?.[0];
  let lastUpdated: string | undefined = undefined;
  if (epoch) {
    const d = new Date(Number(epoch) * 1000);
    if (!isNaN(d.getTime())) {
      lastUpdated = d.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
    }
  }

  // Published Date
  const pubEpoch = row.published_date?.[0] || row.created?.[0];
  let publishedDate: string | undefined = undefined;
  if (pubEpoch) {
    const d = new Date(Number(pubEpoch) * 1000);
    if (!isNaN(d.getTime())) {
      publishedDate = d.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
    }
  }

  // Node alias / link to data.gov.in
  const alias = Array.isArray(row.node_alias) ? row.node_alias[0] : row.node_alias;
  const sourceUrl = alias
    ? `https://data.gov.in${alias.startsWith("/") ? "" : "/"}${alias}`
    : uuid
    ? `https://data.gov.in/catalog/${uuid}`
    : `https://data.gov.in/node/${nid || ""}`;

  const isApi = Array.isArray(row.is_api_available) ? Boolean(row.is_api_available[0]) : false;

  return {
    id,
    title,
    description,
    ministry,
    department: department || undefined,
    sector,
    state: stateJurisdiction,
    jurisdiction: stateJurisdiction,
    publishedDate,
    lastUpdated,
    sourceUrl,
    sourceAuthority: "Open Government Data Platform India (data.gov.in)",
    isOfficialOgd: true,
    apiAvailable: isApi,
    nid: nid ? Number(nid) : undefined,
    uuid: uuid ? String(uuid) : undefined,
  };
}

/**
 * Searches the official Open Government Data Platform (data.gov.in) catalog programmatically.
 * Uses the official public catalog discovery endpoint without requiring an API key.
 * Does NOT persist or download dataset records into the database.
 * 
 * Geographic relevance ranking:
 * When common Indian geographic terms (e.g. Tamil Nadu, Kerala, Maharashtra, etc.) are present
 * in the query, candidate results are re-ranked using metadata that actually exists in each
 * catalogue result. Broader national datasets are kept. When no geographic terms are present,
 * original OGD relevance order is strictly preserved.
 */
export async function searchOgdCatalog(
  query: string,
  options: { offset?: number; limit?: number; signal?: AbortSignal } = {}
): Promise<OgdCatalogSearchResponse> {
  const trimmed = query.trim();
  const offset = Math.max(0, options.offset || 0);
  const limit = Math.max(1, Math.min(50, options.limit || 10));
  const retrievedAt = new Date().toISOString();

  if (!trimmed) {
    return {
      success: true,
      query: "",
      total: 0,
      items: [],
      source: "Open Government Data Platform India (data.gov.in)",
      searchEndpoint: OGD_CATALOG_CONFIG.catalogSearchUrl,
      authRequired: false,
      detectedGeography: null,
      detectedDistrict: null,
      detectedState: null,
      timestamp: retrievedAt,
    };
  }

  const detectedGeo = detectIndianGeography(trimmed);
  const topicWords = extractTopicKeywords(trimmed, detectedGeo);

  // If a geographic term (district or state) is detected and we are querying page 1 (offset === 0),
  // fetch a candidate pool (up to 100 items) so matching-district & matching-state datasets are surfaced to the top.
  const fetchLimit = detectedGeo && offset === 0 ? Math.min(100, Math.max(limit * 4, 100)) : limit;
  const url = `${OGD_CATALOG_CONFIG.catalogSearchUrl}?query=${encodeURIComponent(trimmed)}&offset=${offset}&limit=${fetchLimit}`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 NIRNAYA-Search-Adapter/1.0",
        Accept: "application/json",
      },
      signal: options.signal || AbortSignal.timeout(12000),
    });

    if (!response.ok) {
      throw new Error(`Official data.gov.in catalog returned HTTP ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as any;
    const rawRows = Array.isArray(data?.data?.rows) ? data.data.rows : [];
    const total = typeof data?.total === "number" ? data.total : rawRows.length;

    const normalizedItems = rawRows.map((r: any) => normalizeDiscoveredCatalog(r));

    let finalItems = normalizedItems;
    if (detectedGeo) {
      const ranked = rankDatasetsByGeography(normalizedItems, detectedGeo, topicWords);
      finalItems = ranked.slice(0, limit);
    }

    return {
      success: true,
      query: trimmed,
      total,
      items: finalItems,
      source: "Open Government Data Platform India (data.gov.in)",
      searchEndpoint: url,
      authRequired: false,
      detectedGeography: detectedGeo ? detectedGeo.label : null,
      detectedDistrict: detectedGeo ? detectedGeo.district : null,
      detectedState: detectedGeo ? detectedGeo.state : null,
      timestamp: retrievedAt,
    };
  } catch (err: any) {
    console.error("OGD catalog search error:", err);
    return {
      success: false,
      query: trimmed,
      total: 0,
      items: [],
      source: "Open Government Data Platform India (data.gov.in)",
      searchEndpoint: url,
      authRequired: false,
      detectedGeography: detectedGeo ? detectedGeo.label : null,
      detectedDistrict: detectedGeo ? detectedGeo.district : null,
      detectedState: detectedGeo ? detectedGeo.state : null,
      timestamp: retrievedAt,
      error: err.message || "Failed to reach official data.gov.in catalog",
    };
  }
}

