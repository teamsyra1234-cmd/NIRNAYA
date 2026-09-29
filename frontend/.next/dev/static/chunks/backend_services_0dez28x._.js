(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/backend/services/adapters/bhuvan.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * NIRNAYA — Official Bhuvan / NRSC / ISRO Geospatial Adapter
 * 
 * Connects directly to the official National Remote Sensing Centre (NRSC),
 * Indian Space Research Organisation (ISRO) OGC WMS service:
 * https://bhuvan-vec2.nrsc.gov.in/bhuvan/sisdpv2/wms
 * 
 * Verified Layers:
 * 1. sisdpv2:TN_Kancheepuram_lulc_v2 (Kancheepuram District SISDP V2 1:10,000 LULC)
 * 2. sisdpv2:TN_Thiruvallur_lulc_v2 (Thiruvallur District SISDP V2 1:10,000 LULC)
 * 3. sisdpv2:TN_Chennai_lulc_v2 (Chennai District SISDP V2 1:10,000 LULC)
 * 
 * Rules:
 * - Consumes the official WMS directly in the map interface.
 * - No local caching, repackaging, or storage of satellite raster tiles.
 * - Clear distinction between live OGC service consumption and locally stored records.
 */ __turbopack_context__.s([
    "BHUVAN_CONFIG",
    ()=>BHUVAN_CONFIG,
    "buildBhuvanFeatureInfoUrl",
    ()=>buildBhuvanFeatureInfoUrl,
    "formatBhuvanArea",
    ()=>formatBhuvanArea,
    "getBhuvanLegendUrl",
    ()=>getBhuvanLegendUrl,
    "getBhuvanStatus",
    ()=>getBhuvanStatus,
    "getBhuvanWmsUrl",
    ()=>getBhuvanWmsUrl,
    "queryBhuvanFeatureInfo",
    ()=>queryBhuvanFeatureInfo,
    "resolveBhuvanLayerForDistrict",
    ()=>resolveBhuvanLayerForDistrict,
    "verifyBhuvanLive",
    ()=>verifyBhuvanLive
]);
const BHUVAN_CONFIG = {
    portalUrl: "https://bhuvan.nrsc.gov.in/",
    wmsEndpoint: "https://bhuvan-vec2.nrsc.gov.in/bhuvan/sisdpv2/wms",
    authority: "National Remote Sensing Centre (NRSC), ISRO, Government of India",
    sourceName: "Bhuvan (ISRO / NRSC)",
    serviceType: "OGC WMS 1.1.1 / 1.3.0",
    defaultCrs: "EPSG:4326",
    attribution: "Source: Bhuvan / NRSC / ISRO, Government of India",
    legalNotice: "Consumed live via official OGC Web Map Service under ISRO Bhuvan Open Data policy. Imagery is rendered directly in the client and is not downloaded or redistributed.",
    layers: {
        stateLulc: {
            name: "sisdpv2:TN_Kancheepuram_lulc_v2",
            title: "Tamil Nadu SIS-DP LULC (1:10,000)",
            description: "Space-based Information Support for Decentralised Planning (SIS-DP) 1:10,000 thematic layer",
            bbox: "79.5597,12.2288,80.2664,13.0630",
            crs: "EPSG:4326",
            style: "sisdpv2:sisdp_lulc_v2"
        },
        kancheepuramLulc: {
            name: "sisdpv2:TN_Kancheepuram_lulc_v2",
            title: "Kancheepuram District LULC (SISDP V2)",
            description: "High-resolution Space-based Information Support for Decentralised Planning LULC (1:10,000)",
            bbox: "79.5597,12.2288,80.2664,13.0630",
            crs: "EPSG:4326",
            style: "sisdpv2:sisdp_lulc_v2"
        },
        thiruvallurLulc: {
            name: "sisdpv2:TN_Thiruvallur_lulc_v2",
            title: "Thiruvallur District LULC (SISDP V2)",
            description: "Decentralised planning thematic layer for peri-urban and coastal land cover",
            bbox: "79.7,13.0,80.3,13.5",
            crs: "EPSG:4326",
            style: "sisdpv2:sisdp_lulc_v2"
        },
        chennaiLulc: {
            name: "sisdpv2:TN_Chennai_lulc_v2",
            title: "Chennai District LULC (SISDP V2)",
            description: "Metropolitan high-density built-up, wetland, and surface water classifications",
            bbox: "80.1,12.9,80.35,13.2",
            crs: "EPSG:4326",
            style: "sisdpv2:sisdp_lulc_v2"
        },
        coimbatoreLulc: {
            name: "sisdpv2:TN_Coimbatore_lulc_v2",
            title: "Coimbatore District LULC (SISDP V2)",
            description: "Space-based Information Support for Decentralised Planning LULC (1:10,000)",
            bbox: "76.6,10.7,77.3,11.5",
            crs: "EPSG:4326",
            style: "sisdpv2:sisdp_lulc_v2"
        },
        puneLulc: {
            name: "sisdpv2:MH_Pune_lulc_v2",
            title: "Pune District LULC (SISDP V2)",
            description: "Space-based Information Support for Decentralised Planning LULC (1:10,000)",
            bbox: "73.3,18.0,75.2,19.4",
            crs: "EPSG:4326",
            style: "sisdpv2:sisdp_lulc_v2"
        },
        jaipurLulc: {
            name: "sisdpv2:RJ_Jaipur_lulc_v2",
            title: "Jaipur District LULC (SISDP V2)",
            description: "Space-based Information Support for Decentralised Planning LULC (1:10,000)",
            bbox: "74.9,26.5,76.3,27.9",
            crs: "EPSG:4326",
            style: "sisdpv2:sisdp_lulc_v2"
        }
    }
};
function getBhuvanWmsUrl(options = {}) {
    const layer = options.layer || BHUVAN_CONFIG.layers.kancheepuramLulc.name;
    const bbox = options.bbox || BHUVAN_CONFIG.layers.kancheepuramLulc.bbox;
    const width = options.width || 600;
    const height = options.height || 600;
    const transparent = options.transparent !== false ? "TRUE" : "FALSE";
    const format = options.format || "image/png";
    const crs = options.crs || BHUVAN_CONFIG.defaultCrs;
    const params = new URLSearchParams({
        SERVICE: "WMS",
        VERSION: "1.1.1",
        REQUEST: "GetMap",
        LAYERS: layer,
        STYLES: "",
        BBOX: bbox,
        WIDTH: String(width),
        HEIGHT: String(height),
        SRS: crs,
        FORMAT: format,
        TRANSPARENT: transparent
    });
    return `${BHUVAN_CONFIG.wmsEndpoint}?${params.toString()}`;
}
function getBhuvanLegendUrl(layerName) {
    const layer = layerName || BHUVAN_CONFIG.layers.kancheepuramLulc.name;
    const params = new URLSearchParams({
        REQUEST: "GetLegendGraphic",
        VERSION: "1.1.1",
        FORMAT: "image/png",
        WIDTH: "20",
        HEIGHT: "20",
        LAYER: layer
    });
    return `${BHUVAN_CONFIG.wmsEndpoint}?${params.toString()}`;
}
function resolveBhuvanLayerForDistrict(districtName) {
    const norm = (districtName || "").toLowerCase().trim();
    if (norm.includes("kancheepuram") || norm.includes("kanchi")) {
        return {
            layerName: BHUVAN_CONFIG.layers.kancheepuramLulc.name,
            title: BHUVAN_CONFIG.layers.kancheepuramLulc.title,
            bbox: BHUVAN_CONFIG.layers.kancheepuramLulc.bbox,
            isDistrictSpecific: true
        };
    }
    if (norm.includes("thiruvallur") || norm.includes("tiruvallur")) {
        return {
            layerName: BHUVAN_CONFIG.layers.thiruvallurLulc.name,
            title: BHUVAN_CONFIG.layers.thiruvallurLulc.title,
            bbox: BHUVAN_CONFIG.layers.thiruvallurLulc.bbox,
            isDistrictSpecific: true
        };
    }
    if (norm.includes("chennai")) {
        return {
            layerName: BHUVAN_CONFIG.layers.chennaiLulc.name,
            title: BHUVAN_CONFIG.layers.chennaiLulc.title,
            bbox: BHUVAN_CONFIG.layers.chennaiLulc.bbox,
            isDistrictSpecific: true
        };
    }
    if (norm.includes("coimbatore")) {
        return {
            layerName: BHUVAN_CONFIG.layers.coimbatoreLulc.name,
            title: BHUVAN_CONFIG.layers.coimbatoreLulc.title,
            bbox: BHUVAN_CONFIG.layers.coimbatoreLulc.bbox,
            isDistrictSpecific: true
        };
    }
    if (norm.includes("pune")) {
        return {
            layerName: BHUVAN_CONFIG.layers.puneLulc.name,
            title: BHUVAN_CONFIG.layers.puneLulc.title,
            bbox: BHUVAN_CONFIG.layers.puneLulc.bbox,
            isDistrictSpecific: true
        };
    }
    if (norm.includes("jaipur")) {
        return {
            layerName: BHUVAN_CONFIG.layers.jaipurLulc.name,
            title: BHUVAN_CONFIG.layers.jaipurLulc.title,
            bbox: BHUVAN_CONFIG.layers.jaipurLulc.bbox,
            isDistrictSpecific: true
        };
    }
    // Default to Kancheepuram SIS-DP 1:10,000 layer
    return {
        layerName: BHUVAN_CONFIG.layers.kancheepuramLulc.name,
        title: BHUVAN_CONFIG.layers.kancheepuramLulc.title,
        bbox: BHUVAN_CONFIG.layers.kancheepuramLulc.bbox,
        isDistrictSpecific: true
    };
}
async function verifyBhuvanLive() {
    const start = Date.now();
    try {
        const testUrl = `${BHUVAN_CONFIG.wmsEndpoint}?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS=${encodeURIComponent(BHUVAN_CONFIG.layers.kancheepuramLulc.name)}&STYLES=&BBOX=79.5597,12.2288,80.2664,13.0630&WIDTH=10&HEIGHT=10&SRS=EPSG:4326&FORMAT=image/png&TRANSPARENT=TRUE`;
        const controller = new AbortController();
        const timeout = setTimeout(()=>controller.abort(), 8000);
        const res = await fetch(testUrl, {
            method: "GET",
            signal: controller.signal,
            headers: {
                Accept: "image/png,image/*,*/*"
            }
        });
        clearTimeout(timeout);
        const responseTimeMs = Date.now() - start;
        const contentType = res.headers.get("content-type") || "";
        const isImage = contentType.includes("image");
        const isSuccess = res.status === 200 && isImage;
        let errorDetail;
        if (!isSuccess) {
            if (res.status !== 200) {
                errorDetail = `HTTP ${res.status}: ${res.statusText || "Service request failed"}`;
            } else if (!isImage) {
                const text = await res.text();
                const match = text.match(/<ServiceException[^>]*>([\s\S]*?)<\/ServiceException>/i);
                errorDetail = match ? match[1].trim() : `WMS returned non-image response (${contentType})`;
            }
        }
        return {
            isReachable: isSuccess,
            httpStatus: res.status,
            responseTimeMs,
            error: errorDetail
        };
    } catch (err) {
        return {
            isReachable: false,
            httpStatus: null,
            responseTimeMs: Date.now() - start,
            error: err.message || "Failed to establish connection to Bhuvan WMS endpoint"
        };
    }
}
async function getBhuvanStatus() {
    const verification = await verifyBhuvanLive();
    const now = new Date().toISOString();
    const activeLayers = [
        {
            id: "kancheepuram-lulc",
            name: BHUVAN_CONFIG.layers.kancheepuramLulc.name,
            title: BHUVAN_CONFIG.layers.kancheepuramLulc.title,
            bbox: BHUVAN_CONFIG.layers.kancheepuramLulc.bbox,
            description: BHUVAN_CONFIG.layers.kancheepuramLulc.description
        },
        {
            id: "thiruvallur-lulc",
            name: BHUVAN_CONFIG.layers.thiruvallurLulc.name,
            title: BHUVAN_CONFIG.layers.thiruvallurLulc.title,
            bbox: BHUVAN_CONFIG.layers.thiruvallurLulc.bbox,
            description: BHUVAN_CONFIG.layers.thiruvallurLulc.description
        },
        {
            id: "chennai-lulc",
            name: BHUVAN_CONFIG.layers.chennaiLulc.name,
            title: BHUVAN_CONFIG.layers.chennaiLulc.title,
            bbox: BHUVAN_CONFIG.layers.chennaiLulc.bbox,
            description: BHUVAN_CONFIG.layers.chennaiLulc.description
        },
        {
            id: "coimbatore-lulc",
            name: BHUVAN_CONFIG.layers.coimbatoreLulc.name,
            title: BHUVAN_CONFIG.layers.coimbatoreLulc.title,
            bbox: BHUVAN_CONFIG.layers.coimbatoreLulc.bbox,
            description: BHUVAN_CONFIG.layers.coimbatoreLulc.description
        },
        {
            id: "pune-lulc",
            name: BHUVAN_CONFIG.layers.puneLulc.name,
            title: BHUVAN_CONFIG.layers.puneLulc.title,
            bbox: BHUVAN_CONFIG.layers.puneLulc.bbox,
            description: BHUVAN_CONFIG.layers.puneLulc.description
        },
        {
            id: "jaipur-lulc",
            name: BHUVAN_CONFIG.layers.jaipurLulc.name,
            title: BHUVAN_CONFIG.layers.jaipurLulc.title,
            bbox: BHUVAN_CONFIG.layers.jaipurLulc.bbox,
            description: BHUVAN_CONFIG.layers.jaipurLulc.description
        }
    ];
    const isLive = verification.isReachable;
    return {
        officialSource: BHUVAN_CONFIG.sourceName,
        authority: BHUVAN_CONFIG.authority,
        portalUrl: BHUVAN_CONFIG.portalUrl,
        wmsEndpoint: BHUVAN_CONFIG.wmsEndpoint,
        serviceType: BHUVAN_CONFIG.serviceType,
        crs: BHUVAN_CONFIG.defaultCrs,
        status: isLive ? "LIVE / OFFICIAL" : "UNAVAILABLE",
        governanceStatus: isLive ? "LIVE / OFFICIAL" : "UNAVAILABLE",
        isReachable: isLive,
        httpStatus: verification.httpStatus,
        responseTimeMs: verification.responseTimeMs,
        error: verification.error,
        activeLayers,
        attribution: BHUVAN_CONFIG.attribution,
        legalNotice: BHUVAN_CONFIG.legalNotice,
        lastVerification: now
    };
}
function buildBhuvanFeatureInfoUrl(options) {
    const width = options.width || 600;
    const height = options.height || 600;
    const crs = options.crs || BHUVAN_CONFIG.defaultCrs;
    const params = new URLSearchParams({
        SERVICE: "WMS",
        VERSION: "1.1.1",
        REQUEST: "GetFeatureInfo",
        LAYERS: options.layer,
        QUERY_LAYERS: options.layer,
        INFO_FORMAT: "application/json",
        SRS: crs,
        BBOX: options.bbox,
        WIDTH: String(width),
        HEIGHT: String(height),
        X: String(Math.round(options.x)),
        Y: String(Math.round(options.y))
    });
    return `${BHUVAN_CONFIG.wmsEndpoint}?${params.toString()}`;
}
function formatBhuvanArea(area) {
    if (area === undefined || area === null || isNaN(area)) return "N/A";
    if (area <= 0) return "0 m²";
    // If area >= 1, it is stored in square meters (UTM/metric projection)
    if (area >= 1_000_000) {
        const km2 = (area / 1_000_000).toFixed(2);
        return `${km2} km² (${Math.round(area).toLocaleString()} m²)`;
    }
    if (area >= 1) {
        const km2 = (area / 1_000_000).toFixed(4);
        return `${Math.round(area).toLocaleString()} m² (${km2} km²)`;
    }
    // If area < 1, it is stored in square degrees (geographic CRS EPSG:4326)
    // At Indian latitudes (~11° to 27°), 1 deg² ≈ 12,000 km²
    const approxKm2 = (area * 12100).toFixed(3);
    return `${approxKm2} km² (~${area.toFixed(6)} deg²)`;
}
async function queryBhuvanFeatureInfo(options) {
    const queryTime = new Date().toISOString();
    const requestUrl = buildBhuvanFeatureInfoUrl(options);
    // Calculate approximate geographic coordinates from BBOX and pixel X, Y
    let queryCoords = {
        pixelX: options.x,
        pixelY: options.y
    };
    try {
        const bboxParts = options.bbox.split(",").map((v)=>parseFloat(v.trim()));
        if (bboxParts.length === 4 && !bboxParts.some(isNaN)) {
            const [minX, minY, maxX, maxY] = bboxParts;
            const width = options.width || 600;
            const height = options.height || 600;
            const lng = minX + options.x / width * (maxX - minX);
            const lat = maxY - options.y / height * (maxY - minY);
            queryCoords = {
                pixelX: options.x,
                pixelY: options.y,
                lat: Number(lat.toFixed(5)),
                lng: Number(lng.toFixed(5))
            };
        }
    } catch  {
    // Keep pixel coordinates
    }
    const provenance = {
        source: "Bhuvan / NRSC / ISRO, Government of India",
        service: "SIS-DP V2 1:10,000 WMS",
        authority: BHUVAN_CONFIG.authority,
        layer: options.layer,
        queryTime
    };
    try {
        const controller = new AbortController();
        const timeout = setTimeout(()=>controller.abort(), 10000);
        const res = await fetch(requestUrl, {
            method: "GET",
            signal: controller.signal,
            headers: {
                Accept: "application/json,text/plain,*/*"
            }
        });
        clearTimeout(timeout);
        if (!res.ok) {
            return {
                success: false,
                status: "ERROR",
                layer: options.layer,
                requestUrl,
                queryTime,
                queryCoords,
                provenance,
                error: `Bhuvan WMS HTTP ${res.status}: ${res.statusText || "Service request failed"}`
            };
        }
        const contentType = res.headers.get("content-type") || "";
        const rawText = await res.text();
        let data;
        try {
            data = JSON.parse(rawText);
        } catch  {
            const match = rawText.match(/<ServiceException[^>]*>([\s\S]*?)<\/ServiceException>/i);
            const errMsg = match ? match[1].trim() : `Returned non-JSON response (${contentType})`;
            return {
                success: false,
                status: "ERROR",
                layer: options.layer,
                requestUrl,
                queryTime,
                queryCoords,
                provenance,
                error: errMsg
            };
        }
        if (!data || !Array.isArray(data.features)) {
            return {
                success: false,
                status: "ERROR",
                layer: options.layer,
                requestUrl,
                queryTime,
                queryCoords,
                provenance,
                error: "Malformed GeoJSON structure from Bhuvan WMS"
            };
        }
        if (data.features.length === 0) {
            return {
                success: true,
                status: "NO_FEATURE",
                layer: options.layer,
                requestUrl,
                queryTime,
                queryCoords,
                provenance,
                message: "No Bhuvan feature returned at this location."
            };
        }
        const firstFeature = data.features[0];
        const properties = firstFeature.properties || {};
        return {
            success: true,
            status: "FEATURE_FOUND",
            layer: options.layer,
            requestUrl,
            queryTime,
            queryCoords,
            provenance,
            feature: properties,
            rawFeature: firstFeature
        };
    } catch (err) {
        return {
            success: false,
            status: "ERROR",
            layer: options.layer,
            requestUrl,
            queryTime,
            queryCoords,
            provenance,
            error: err.name === "AbortError" ? "Request timed out after 10s" : err.message || "Failed to query Bhuvan service"
        };
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/backend/services/scenarios.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AVAILABLE_INTERVENTIONS",
    ()=>AVAILABLE_INTERVENTIONS,
    "calculateScenario",
    ()=>calculateScenario,
    "clamp",
    ()=>clamp,
    "getRiskLevel",
    ()=>getRiskLevel
]);
const AVAILABLE_INTERVENTIONS = [
    {
        id: "interv-groundwater",
        name: "Groundwater Stress Mitigation & Recharge Zoning",
        category: "Natural Resource Conservation",
        targetMetric: "Water resilience",
        description: "Statutory demarcation of critical aquifer recharge sanctuaries, regulated extraction permits for commercial borewells, and community rainwater retention mandates.",
        disclaimer: "Prototype scenario model input formulated for Smart India Hackathon PS 26019. Not an officially gazetted government policy scheme.",
        defaultParameters: {
            intensity: 75,
            coverage: 70,
            timeHorizon: 3,
            focusArea: "Critical Aquifer Corridors"
        },
        statutoryBasis: "Central Ground Water Authority (CGWA) guidelines and Model Bill for Groundwater Management."
    },
    {
        id: "interv-digitization",
        name: "Land-Record Modernization & Cadastre Digitization",
        category: "Tenure Security & Administration",
        targetMetric: "Administrative feasibility",
        description: "Accelerated resurvey using high-resolution drone orthophotos, end-to-end integration of spatial cadastral boundaries with RoR (Record of Rights), and automated mutation registries.",
        disclaimer: "Prototype scenario model input formulated for Smart India Hackathon PS 26019. Simulates accelerated DILRMP rollout.",
        defaultParameters: {
            intensity: 80,
            coverage: 85,
            timeHorizon: 3,
            focusArea: "Rural & Peri-Urban Taluks"
        },
        statutoryBasis: "Digital India Land Records Modernization Programme (DILRMP) core standards."
    },
    {
        id: "interv-urban-expansion",
        name: "Urban Growth Boundary & Peri-Urban Protection",
        category: "Spatial Planning & Land Use",
        targetMetric: "Environmental protection",
        description: "Implementation of statutory urban containment boundaries, mandatory ecological buffers around agricultural belts, and transfer of development rights (TDR) for farmland preservation.",
        disclaimer: "Prototype scenario model input formulated for Smart India Hackathon PS 26019. Decision-exploration simulation only.",
        defaultParameters: {
            intensity: 65,
            coverage: 60,
            timeHorizon: 5,
            focusArea: "Metropolitan Periphery"
        },
        statutoryBasis: "URDPFI Guidelines (Ministry of Housing and Urban Affairs) & DoLR Peri-Urban Land Directives."
    },
    {
        id: "interv-dispute-reduction",
        name: "Land Dispute Resolution & Revenue Court Fast-Tracking",
        category: "Legal & Dispute Redressal",
        targetMetric: "Administrative feasibility",
        description: "Establishment of digital revenue dispute registries, lok adalat boundary reconciliation drives, and AI-assisted land title chain verification.",
        disclaimer: "Prototype scenario model input formulated for Smart India Hackathon PS 26019. Simulates judicial-administrative acceleration.",
        defaultParameters: {
            intensity: 70,
            coverage: 75,
            timeHorizon: 3,
            focusArea: "Revenue Courts & Sub-Registrar Offices"
        },
        statutoryBasis: "DoLR Model Land Dispute Redressal Protocol & Department of Justice Fast-Track Mechanisms."
    },
    {
        id: "interv-livelihood",
        name: "Smallholder Livelihood Safeguards & Land Transition",
        category: "Social Safeguards & Equity",
        targetMetric: "Livelihood safeguards",
        description: "Fair compensation escrows for land acquisition, mandatory rehabilitation packages, collective tenancy recognition, and land-pooling benefit share for marginal farmers.",
        disclaimer: "Prototype scenario model input formulated for Smart India Hackathon PS 26019. Simulates RFCTLARR implementation elasticity.",
        defaultParameters: {
            intensity: 80,
            coverage: 65,
            timeHorizon: 3,
            focusArea: "Agrarian Households & Tenant Farmers"
        },
        statutoryBasis: "Right to Fair Compensation and Transparency in Land Acquisition, Rehabilitation and Resettlement Act (RFCTLARR)."
    }
];
const clamp = (val, min, max)=>{
    return Math.max(min, Math.min(max, Math.round(val)));
};
function getRiskLevel(score) {
    if (score >= 75) return "Critical";
    if (score >= 60) return "High";
    if (score >= 40) return "Moderate";
    return "Low";
}
function calculateScenario(baseline, sliderValuesOrIntervention, studyInfoOrParams, interventionIdOrParams, explicitParams) {
    // Determine if called with legacy signature (baseline, interventionId: string, params: ScenarioParameters)
    let interventionId = "interv-groundwater";
    let sliderValues = {
        conservation: 65,
        livelihood: 72,
        feasibility: 58,
        water: 80
    };
    let studyInfo = {
        id: "ps-001",
        title: "Peri-urban land conversion safeguards",
        readinessScore: 78
    };
    let params = {
        intensity: 75,
        coverage: 70,
        timeHorizon: 3,
        focusArea: "Critical Aquifer Corridors"
    };
    if (typeof sliderValuesOrIntervention === "string") {
        interventionId = sliderValuesOrIntervention;
        if (studyInfoOrParams && "intensity" in studyInfoOrParams) {
            params = studyInfoOrParams;
            const scale = (params.intensity / 75 + params.coverage / 70) / 2;
            sliderValues = {
                conservation: clamp(Math.round(65 * scale), 10, 100),
                livelihood: clamp(Math.round(72 * scale), 10, 100),
                feasibility: clamp(Math.round(58 * scale), 10, 100),
                water: clamp(Math.round(80 * scale), 10, 100)
            };
        }
    } else if (typeof sliderValuesOrIntervention === "object" && sliderValuesOrIntervention !== null) {
        sliderValues = {
            conservation: sliderValuesOrIntervention.conservation ?? 65,
            livelihood: sliderValuesOrIntervention.livelihood ?? 72,
            feasibility: sliderValuesOrIntervention.feasibility ?? 58,
            water: sliderValuesOrIntervention.water ?? 80
        };
        if (studyInfoOrParams && "title" in studyInfoOrParams) {
            studyInfo = {
                id: studyInfoOrParams.id || "ps-001",
                title: studyInfoOrParams.title || "Peri-urban land conversion safeguards",
                readinessScore: studyInfoOrParams.readinessScore ?? 78
            };
        } else if (studyInfoOrParams && "intensity" in studyInfoOrParams) {
            params = studyInfoOrParams;
        }
        if (typeof interventionIdOrParams === "string") {
            interventionId = interventionIdOrParams;
        } else if (typeof interventionIdOrParams === "object" && interventionIdOrParams !== null && "intensity" in interventionIdOrParams) {
            params = interventionIdOrParams;
        }
        if (explicitParams && "intensity" in explicitParams) {
            params = explicitParams;
        }
    }
    const C = clamp(sliderValues.conservation, 0, 100);
    const L = clamp(sliderValues.livelihood, 0, 100);
    const F = clamp(sliderValues.feasibility, 0, 100);
    const W = clamp(sliderValues.water, 0, 100);
    const intervention = AVAILABLE_INTERVENTIONS.find((i)=>i.id === interventionId) || AVAILABLE_INTERVENTIONS[0];
    const timeFactor = params.timeHorizon === 1 ? 0.55 : params.timeHorizon === 5 ? 1.0 : 0.85;
    const effectiveInterventionFactor = Math.round(params.intensity / 100 * (params.coverage / 100) * timeFactor * 100) / 100;
    // 1. Calculate Policy Readiness Score
    // Weights: Conservation (28%), Livelihood (24%), Feasibility (22%), Water (26%)
    // Modulated by Study Institutional Readiness ((studyInfo.readinessScore - 70) * 0.15)
    // Modulated by District Baseline Vulnerability ((75 - baseline.compositeRisk) * 0.12)
    const weightedSliderSum = C * 0.28 + L * 0.24 + F * 0.22 + W * 0.26;
    const studyModulation = (studyInfo.readinessScore - 70) * 0.15;
    const districtModulation = (75 - baseline.compositeRisk) * 0.12;
    const rawScore = weightedSliderSum + studyModulation + districtModulation;
    const score = clamp(Math.round(rawScore), 10, 100);
    // 2. Projected Directional Impacts (reflecting all 4 slider dimensions)
    const waterImpact = clamp(Math.round(W * 0.28 + (100 - baseline.groundwaterStress) * 0.08), 5, 45);
    const farmlandImpact = clamp(Math.round(C * 0.26 + (100 - baseline.builtUpExpansion) * 0.06), 5, 40);
    const livelihoodImpact = clamp(Math.round(L * 0.24 + (100 - baseline.livelihoodSensitivity) * 0.06), 5, 40);
    // Delivery complexity: At high feasibility (100%), delivery friction drops to 0.
    // At lower feasibility, negative friction increases.
    const deliveryFriction = Math.max(0, Math.round((100 - F) * 0.22 - (studyInfo.readinessScore - 50) * 0.08));
    const deliveryImpact = -deliveryFriction;
    const impacts = [
        {
            name: "Water resilience",
            value: waterImpact
        },
        {
            name: "Farmland retention",
            value: farmlandImpact
        },
        {
            name: "Livelihood security",
            value: livelihoodImpact
        },
        {
            name: "Delivery complexity",
            value: deliveryImpact
        }
    ];
    // 3. Projected Baseline vs Scenario Indicator Shifts
    const scenarioGw = clamp(baseline.groundwaterStress - Math.round(W / 100 * 0.30 * baseline.groundwaterStress), 10, 100);
    const scenarioBuilt = clamp(baseline.builtUpExpansion - Math.round(C / 100 * 0.25 * baseline.builtUpExpansion), 10, 100);
    const scenarioLiv = clamp(baseline.livelihoodSensitivity - Math.round(L / 100 * 0.25 * baseline.livelihoodSensitivity), 10, 100);
    const scenarioDisp = clamp(baseline.landDisputeIntensity - Math.round(F / 100 * 0.28 * baseline.landDisputeIntensity), 10, 100);
    const scenarioComp = clamp(baseline.dataCompleteness + Math.round(F / 100 * 0.40 * (100 - baseline.dataCompleteness)), 0, 98);
    const scenarioCompositeRisk = clamp(Math.round(0.28 * scenarioGw + 0.22 * scenarioBuilt + 0.22 * scenarioLiv + 0.18 * scenarioDisp + 0.10 * (100 - scenarioComp)), 5, 100);
    const baselineRiskLevel = getRiskLevel(baseline.compositeRisk);
    const scenarioRiskLevel = getRiskLevel(scenarioCompositeRisk);
    const readinessVerdict = score >= 75 ? "Recommended for Multi-Taluk Pilot" : score >= 60 ? "Conditional Pilot / Revisions Required" : "High Implementation Friction: Revise Baseline Safeguards First";
    const recommendation = score >= 75 ? `Proceed to a multi-taluk district pilot in ${baseline.name} with aquifer-recharge buffers, mandatory livelihood transition allowances, and quarterly satellite monitoring under ${studyInfo.title}.` : score >= 60 ? `Conduct an administrative readiness revision in ${baseline.name} to enhance inter-departmental revenue coordination before authorising field pilot.` : `High implementation friction: Priority must be given to strengthening baseline land tenure certainty and community safeguards in ${baseline.name} before zoning controls.`;
    const indicators = [
        buildComparison("groundwaterStress", "Groundwater Stress", "%", baseline.groundwaterStress, scenarioGw, false),
        buildComparison("builtUpExpansion", "Built-up Expansion", "%", baseline.builtUpExpansion, scenarioBuilt, false),
        buildComparison("livelihoodSensitivity", "Livelihood Vulnerability", "%", baseline.livelihoodSensitivity, scenarioLiv, false),
        buildComparison("landDisputeIntensity", "Land Dispute Index", "%", baseline.landDisputeIntensity, scenarioDisp, false),
        buildComparison("dataCompleteness", "Land Records Digitization", "%", baseline.dataCompleteness, scenarioComp, true),
        buildComparison("compositeRisk", "Composite Risk Score", "%", baseline.compositeRisk, scenarioCompositeRisk, false)
    ];
    return {
        runId: `run-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        districtId: baseline.id,
        districtName: baseline.name,
        state: baseline.state,
        studyId: studyInfo.id,
        studyName: studyInfo.title,
        interventionId: intervention.id,
        interventionName: intervention.name,
        parameters: params,
        effectiveInterventionFactor,
        baseline,
        score,
        readinessScore: score,
        readinessVerdict,
        baselineCompositeRisk: baseline.compositeRisk,
        scenarioCompositeRisk,
        baselineRiskLevel,
        scenarioRiskLevel,
        sliders: {
            conservation: C,
            livelihood: L,
            feasibility: F,
            water: W
        },
        impacts,
        indicators,
        calculationExplanation: {
            methodology: "Weighted Multi-Criteria Spatial Decision Model (NIRNAYA v2.1)",
            effectiveFactorFormula: `Score = (${C}% × 0.28) + (${L}% × 0.24) + (${F}% × 0.22) + (${W}% × 0.26) + StudyAdj(${studyModulation > 0 ? "+" : ""}${studyModulation.toFixed(1)}) + DistrictAdj(${districtModulation > 0 ? "+" : ""}${districtModulation.toFixed(1)}) = ${score}/100`,
            targetRule: `Administrative Feasibility (${F}%) directly modulates Delivery Complexity (${deliveryImpact}%), Dispute Index (-${Math.round(F / 100 * 0.28 * baseline.landDisputeIntensity)}%), and Cadastre Digitization (+${Math.round(F / 100 * 0.40 * (100 - baseline.dataCompleteness))}%).`,
            secondaryRule: `Environmental (${C}%) and Water (${W}%) priorities scale Farmland Retention (+${farmlandImpact}%) and Groundwater Resilience (+${waterImpact}%).`,
            assumptionsUsed: [
                `Baseline indicators queried directly from NIRNAYA SQLite districts database for ${baseline.name}.`,
                `Selected Policy Study '${studyInfo.title}' contributes institutional baseline readiness of ${studyInfo.readinessScore}/100.`,
                `Administrative feasibility weight (22%) directly governs public revenue department implementation friction.`
            ],
            disclaimer: "Model-based prototype scenario estimate. For decision exploration and preflight policy testing under Smart India Hackathon PS 26019. Not an official government forecast or legally binding causal guarantee."
        },
        recommendation,
        createdAt: new Date().toISOString()
    };
}
function buildComparison(key, label, unit, baseline, scenario, higherIsBetter) {
    const absoluteChange = scenario - baseline;
    const percentChange = baseline !== 0 ? Math.round((scenario - baseline) / baseline * 1000) / 10 : 0;
    let direction = "neutral";
    if (absoluteChange !== 0) {
        if (higherIsBetter) {
            direction = absoluteChange > 0 ? "improved" : "worsened";
        } else {
            direction = absoluteChange < 0 ? "improved" : "worsened";
        }
    }
    return {
        key,
        label,
        unit,
        baseline,
        scenario,
        absoluteChange,
        percentChange,
        direction,
        higherIsBetter
    };
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=backend_services_0dez28x._.js.map