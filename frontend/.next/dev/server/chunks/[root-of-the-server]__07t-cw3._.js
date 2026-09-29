module.exports = [
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/action-async-storage.external.js [external] (next/dist/server/app-render/action-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/server/app-render/action-async-storage.external.js", () => require("next/dist/server/app-render/action-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/runtime-reacts.external.js [external] (next/dist/server/runtime-reacts.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/server/runtime-reacts.external.js", () => require("next/dist/server/runtime-reacts.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/node:stream [external] (node:stream, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("node:stream", () => require("node:stream"));

module.exports = mod;
}),
"[project]/backend/services/adapters/bhuvan.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
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
}),
"[project]/frontend/app/api/v1/adapters/bhuvan/feature-info/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$4_$40$babel$2b$core$40$7$2e$2_707dc16f33a3769b0099c12fbda4ada8$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.pnpm/next@16.3.4_@babel+core@7.2_707dc16f33a3769b0099c12fbda4ada8/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$backend$2f$services$2f$adapters$2f$bhuvan$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/backend/services/adapters/bhuvan.ts [app-route] (ecmascript)");
;
;
async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const layer = searchParams.get("layer");
        const bbox = searchParams.get("bbox");
        const widthParam = searchParams.get("width");
        const heightParam = searchParams.get("height");
        const xParam = searchParams.get("x");
        const yParam = searchParams.get("y");
        if (!layer || !bbox || xParam === null || yParam === null) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$4_$40$babel$2b$core$40$7$2e$2_707dc16f33a3769b0099c12fbda4ada8$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                success: false,
                status: "ERROR",
                error: "Missing required query parameters: layer, bbox, x, y"
            }, {
                status: 400
            });
        }
        const width = widthParam ? parseInt(widthParam, 10) : 600;
        const height = heightParam ? parseInt(heightParam, 10) : 600;
        const x = parseFloat(xParam);
        const y = parseFloat(yParam);
        if (isNaN(x) || isNaN(y) || isNaN(width) || isNaN(height)) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$4_$40$babel$2b$core$40$7$2e$2_707dc16f33a3769b0099c12fbda4ada8$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                success: false,
                status: "ERROR",
                error: "Invalid numeric values for coordinates or dimensions"
            }, {
                status: 400
            });
        }
        const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$backend$2f$services$2f$adapters$2f$bhuvan$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["queryBhuvanFeatureInfo"])({
            layer,
            bbox,
            width,
            height,
            x,
            y
        });
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$4_$40$babel$2b$core$40$7$2e$2_707dc16f33a3769b0099c12fbda4ada8$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json(result);
    } catch (error) {
        console.error("Bhuvan GetFeatureInfo API error:", error);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$3$2e$4_$40$babel$2b$core$40$7$2e$2_707dc16f33a3769b0099c12fbda4ada8$2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: false,
            status: "ERROR",
            error: error.message || "Failed to query Bhuvan GetFeatureInfo service"
        }, {
            status: 500
        });
    }
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__07t-cw3._.js.map