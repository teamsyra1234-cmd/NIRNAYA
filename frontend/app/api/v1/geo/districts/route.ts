import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { districts, evidence } from "@/db/schema";
import { like, or, eq, SQL, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = request.nextUrl;
    const layer = searchParams.get("layer") || "Water stress";
    const search = searchParams.get("search")?.trim();
    const state = searchParams.get("state")?.trim();

    const conditions: SQL[] = [];

    if (search) {
      const pattern = `%${search}%`;
      conditions.push(
        or(
          like(districts.name, pattern),
          like(districts.state, pattern),
          like(districts.notes, pattern),
          like(districts.keySources, pattern)
        )!
      );
    }

    if (state && state !== "All" && state !== "All states") {
      conditions.push(eq(districts.state, state));
    }

    const queryBuilder = db.select().from(districts);
    const rows = conditions.length > 0
      ? await queryBuilder.where(and(...conditions)).all()
      : await queryBuilder.all();

    // Query evidence table to count linked records per district
    const allEvidence = await db.select({
      district: evidence.district,
      state: evidence.state,
      geography: evidence.geography,
    }).from(evidence).all();

    const formatted = rows.map((d) => {
      // Calculate layer-specific score
      let layerScore = d.compositeRisk;
      if (layer === "Water stress") layerScore = d.groundwaterStress;
      else if (layer === "Urban growth") layerScore = d.builtUpExpansion;
      else if (layer === "Land disputes") layerScore = d.landDisputeIntensity;
      else if (layer === "Composite risk") layerScore = d.compositeRisk;

      // Count linked evidence records
      const linkedEvidence = allEvidence.filter((e) => {
        const nameMatch = Boolean(e.district && e.district.toLowerCase().includes(d.name.toLowerCase()));
        const geoMatch = Boolean(e.geography && e.geography.toLowerCase().includes(d.name.toLowerCase()));
        const stateMatch = Boolean(e.state && e.state.toLowerCase() === d.state.toLowerCase());
        return nameMatch || geoMatch || stateMatch;
      });

      return {
        id: d.id,
        name: d.name,
        state: d.state,
        areaSqKm: d.areaSqKm,
        compositeRisk: d.compositeRisk,
        riskLevel: d.riskLevel,
        layerScore,
        indicators: {
          groundwaterStress: d.groundwaterStress,
          builtUpExpansion: d.builtUpExpansion,
          livelihoodSensitivity: d.livelihoodSensitivity,
          dataCompleteness: d.dataCompleteness,
          landDisputeIntensity: d.landDisputeIntensity,
        },
        datasetsCombined: d.datasetsCombined,
        keySources: d.keySources,
        notes: d.notes,
        svgRegionClass: d.svgRegionClass || "r2",
        evidenceCount: Math.max(1, linkedEvidence.length),
      };
    });

    return NextResponse.json({
      districts: formatted,
      total: formatted.length,
      activeLayer: layer,
      provenance: {
        sources: [
          "Central Ground Water Board (CGWB) Dynamic Groundwater Assessment 2024",
          "NRSC / Bhuvan 1:50,000 Land Use / Land Cover (2015-2023)",
          "Census of India Socio-Economic & Agricultural Profiles",
          "Department of Land Resources (DoLR) DILRMP / ULPIN Status",
        ],
        datasetType: "Database-backed pilot district layer",
        snapshot: "2026-09-22",
        disclaimer: "Curated demonstration indicators normalized in local SQLite database for Smart India Hackathon PS 26019 decision modeling. Not a live unverified satellite API feed.",
      },
    });
  } catch (error) {
    console.error("Districts API error:", error);
    return NextResponse.json(
      { error: "Failed to load district geospatial data from database." },
      { status: 500 }
    );
  }
}
