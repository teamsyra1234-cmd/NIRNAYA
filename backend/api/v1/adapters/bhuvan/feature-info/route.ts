import { NextRequest, NextResponse } from "next/server";
import { queryBhuvanFeatureInfo } from "@/lib/adapters/bhuvan";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const layer = searchParams.get("layer");
    const bbox = searchParams.get("bbox");
    const widthParam = searchParams.get("width");
    const heightParam = searchParams.get("height");
    const xParam = searchParams.get("x");
    const yParam = searchParams.get("y");

    if (!layer || !bbox || xParam === null || yParam === null) {
      return NextResponse.json(
        {
          success: false,
          status: "ERROR",
          error: "Missing required query parameters: layer, bbox, x, y",
        },
        { status: 400 }
      );
    }

    const width = widthParam ? parseInt(widthParam, 10) : 600;
    const height = heightParam ? parseInt(heightParam, 10) : 600;
    const x = parseFloat(xParam);
    const y = parseFloat(yParam);

    if (isNaN(x) || isNaN(y) || isNaN(width) || isNaN(height)) {
      return NextResponse.json(
        {
          success: false,
          status: "ERROR",
          error: "Invalid numeric values for coordinates or dimensions",
        },
        { status: 400 }
      );
    }

    const result = await queryBhuvanFeatureInfo({
      layer,
      bbox,
      width,
      height,
      x,
      y,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Bhuvan GetFeatureInfo API error:", error);
    return NextResponse.json(
      {
        success: false,
        status: "ERROR",
        error: error.message || "Failed to query Bhuvan GetFeatureInfo service",
      },
      { status: 500 }
    );
  }
}
