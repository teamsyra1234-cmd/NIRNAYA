import { NextResponse } from "next/server";
import { getBhuvanStatus, BHUVAN_CONFIG } from "@/lib/adapters/bhuvan";

export async function GET() {
  try {
    const status = await getBhuvanStatus();

    return NextResponse.json({
      success: true,
      officialSource: status.officialSource,
      authority: status.authority,
      portalUrl: status.portalUrl,
      wmsEndpoint: status.wmsEndpoint,
      serviceType: status.serviceType,
      crs: status.crs,
      serviceStatus: status.status,
      governanceStatus: status.governanceStatus,
      isReachable: status.isReachable,
      httpStatus: status.httpStatus,
      responseTimeMs: status.responseTimeMs,
      error: status.error,
      availableLayers: status.activeLayers,
      attribution: status.attribution,
      legalNotice: status.legalNotice,
      lastVerification: status.lastVerification,
      consumptionMode: "Direct client-side OGC WMS rendering (no local storage or caching of satellite imagery)",
    });
  } catch (error: any) {
    console.error("Bhuvan Adapter GET error:", error);
    return NextResponse.json(
      {
        success: false,
        officialSource: BHUVAN_CONFIG.sourceName,
        authority: BHUVAN_CONFIG.authority,
        wmsEndpoint: BHUVAN_CONFIG.wmsEndpoint,
        serviceStatus: "UNAVAILABLE",
        governanceStatus: "UNAVAILABLE",
        isReachable: false,
        error: error.message || "Failed to query Bhuvan service status.",
        attribution: BHUVAN_CONFIG.attribution,
        lastVerification: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
