import { NextRequest, NextResponse } from "next/server";
import { searchOgdCatalog } from "@/lib/adapters/ogd";

export const dynamic = "force-dynamic";

/**
 * Server-side search endpoint for official Open Government Data (data.gov.in) catalog discovery.
 * Programmatically discovers datasets from the official OGD catalog without requiring an API key.
 * Does NOT download or persist records into SQLite.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const query = searchParams.get("q") || searchParams.get("query") || "";
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const result = await searchOgdCatalog(query, {
      limit: isNaN(limit) ? 10 : limit,
      offset: isNaN(offset) ? 0 : offset,
    });

    return NextResponse.json(result, {
      status: result.success ? 200 : 502,
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (error: any) {
    console.error("OGD discovery API error:", error);
    return NextResponse.json(
      {
        success: false,
        query: "",
        total: 0,
        items: [],
        source: "Open Government Data Platform India (data.gov.in)",
        authRequired: false,
        error: error.message || "Failed to discover datasets from data.gov.in",
      },
      { status: 500 }
    );
  }
}
