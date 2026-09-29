import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { evidence } from "@/db/schema";
import { like, or, eq, and, gte, SQL } from "drizzle-orm";
import { searchOgdCatalog } from "@/lib/adapters/ogd";

export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = request.nextUrl;
    const q = searchParams.get("q")?.trim();
    const type = searchParams.get("type")?.trim();
    const authority = searchParams.get("authority")?.trim();
    const geography = searchParams.get("geography")?.trim();
    const state = searchParams.get("state")?.trim();
    const yearStr = searchParams.get("year")?.trim();
    const minScoreStr = searchParams.get("minScore")?.trim();

    const conditions: SQL[] = [];

    // Filter by Type
    if (type && type !== "All" && type !== "All sources") {
      conditions.push(eq(evidence.type, type));
    }

    // Filter by Authority
    if (authority && authority !== "All" && authority !== "All authorities") {
      conditions.push(eq(evidence.authority, authority));
    }

    // Filter by Geography / State
    const geoFilter = geography || state;
    if (geoFilter && geoFilter !== "All" && geoFilter !== "All geographies" && geoFilter !== "All states") {
      conditions.push(
        or(
          eq(evidence.geography, geoFilter),
          eq(evidence.state, geoFilter),
          like(evidence.geography, `%${geoFilter}%`),
          like(evidence.state, `%${geoFilter}%`)
        )!
      );
    }

    // Filter by Year
    if (yearStr && yearStr !== "All" && yearStr !== "All years") {
      const yearNum = parseInt(yearStr, 10);
      if (!isNaN(yearNum)) {
        conditions.push(eq(evidence.year, yearNum));
      }
    }

    // Filter by Minimum Relevance Score
    if (minScoreStr) {
      const minScoreNum = parseInt(minScoreStr, 10);
      if (!isNaN(minScoreNum)) {
        conditions.push(gte(evidence.score, minScoreNum));
      }
    }

    // Free-text Search across relevant database fields
    if (q) {
      const pattern = `%${q}%`;
      conditions.push(
        or(
          like(evidence.title, pattern),
          like(evidence.summary, pattern),
          like(evidence.authority, pattern),
          like(evidence.geography, pattern),
          like(evidence.state, pattern),
          like(evidence.district, pattern),
          like(evidence.type, pattern),
          like(evidence.tags, pattern),
          like(evidence.citation, pattern),
          like(evidence.methodologyNote, pattern)
        )!
      );
    }

    const queryBuilder = db.select().from(evidence);
    const matchedRows = conditions.length > 0
      ? await queryBuilder.where(and(...conditions)).all()
      : await queryBuilder.all();

    // Fetch distinct filter values from SQLite for dynamic frontend options
    const allRows = await db.select({
      type: evidence.type,
      authority: evidence.authority,
      geography: evidence.geography,
      state: evidence.state,
      year: evidence.year,
    }).from(evidence).all();

    const distinctTypes = Array.from(new Set(allRows.map((r) => r.type))).sort();
    const distinctAuthorities = Array.from(new Set(allRows.map((r) => r.authority))).sort();
    const distinctGeographies = Array.from(
      new Set(allRows.flatMap((r) => [r.geography, r.state].filter(Boolean) as string[]))
    ).sort();
    const distinctYears = Array.from(new Set(allRows.map((r) => r.year))).sort((a, b) => b - a);

    const items = matchedRows.map((item) => {
      let parsedTags: string[] = [];
      try {
        parsedTags = JSON.parse(item.tags);
      } catch {
        parsedTags = [item.tags];
      }
      return {
        id: item.id,
        title: item.title,
        type: item.type,
        authority: item.authority,
        year: item.year,
        geography: item.geography,
        state: item.state,
        district: item.district,
        score: item.score,
        summary: item.summary,
        tags: parsedTags,
        sourceUrl: item.sourceUrl,
        checksum: item.checksum,
        provenanceDate: item.provenanceDate,
        verified: Boolean(item.verified),
        citation: item.citation,
        methodologyNote: item.methodologyNote,
      };
    });

    let ogdDiscovery: {
      total: number;
      items: any[];
      source: string;
      searchEndpoint: string;
      authRequired: boolean;
      detectedGeography?: string | null;
      error?: string;
    } | null = null;

    const includeOgd = searchParams.get("includeOgd") === "true";
    if (includeOgd && q) {
      try {
        const ogdRes = await searchOgdCatalog(q, { limit: 10 });
        ogdDiscovery = {
          total: ogdRes.total,
          items: ogdRes.items,
          source: ogdRes.source,
          searchEndpoint: ogdRes.searchEndpoint,
          authRequired: false,
          detectedGeography: ogdRes.detectedGeography || null,
          error: ogdRes.error,
        };
      } catch (err: any) {
        console.error("OGD catalog discovery error in evidence route:", err);
      }
    }

    return NextResponse.json({
      items,
      total: items.length,
      ogd: ogdDiscovery,
      filterOptions: {
        types: distinctTypes,
        authorities: distinctAuthorities,
        geographies: distinctGeographies,
        years: distinctYears,
      },
      provenance: {
        snapshot: "2026-09-22",
        mode: "database-backed",
        authority: "Ministry of Rural Development / Department of Land Resources (PS 26019)",
        notice: "Evidence records verified with SHA-256 integrity checksums and source authority metadata from SQLite database.",
      },
    });
  } catch (error) {
    console.error("Evidence API error:", error);
    return NextResponse.json(
      { error: "Failed to query evidence from database." },
      { status: 500 }
    );
  }
}
