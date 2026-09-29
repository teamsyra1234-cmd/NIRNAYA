import { NextRequest, NextResponse } from "next/server";
import { getOgdStatus, syncOgdData, OGD_CONFIG } from "@/lib/adapters/ogd";

export async function GET() {
  try {
    const status = await getOgdStatus();
    return NextResponse.json({
      success: true,
      adapter: "Open Government Data (OGD) Platform India",
      officialDataset: OGD_CONFIG,
      connector: status.connector,
      recordsCount: status.recordsCount,
      lastRetrievedAt: status.lastRetrievedAt,
      recentRecords: status.recentRecords,
      governanceNotice: "Certified under National Data Sharing and Accessibility Policy (NDSAP). Ingestion provenance verified with SHA-256 payload integrity.",
    });
  } catch (error: any) {
    console.error("OGD Adapter GET error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve OGD adapter status." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: { apiKey?: string; limit?: number } = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const result = await syncOgdData({
      apiKey: body.apiKey,
      limit: body.limit,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("OGD Adapter POST error:", error);
    return NextResponse.json(
      {
        success: false,
        status: "ERROR",
        error: error.message || "Failed to execute OGD synchronization.",
      },
      { status: 500 }
    );
  }
}
