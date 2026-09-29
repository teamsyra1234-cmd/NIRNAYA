import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { policyStudies, evidence, districts } from "@/db/schema";

function classifyEvidenceSource(authority: string, _type?: string): "government" | "research" | "other" {
  const normAuth = authority.toLowerCase();

  // Research / academic institutions
  const isResearchInstitution =
    normAuth.includes("institute") ||
    normAuth.includes("academic") ||
    normAuth.includes("university") ||
    normAuth.includes("college") ||
    normAuth.includes("iihs") ||
    normAuth.includes("niua");

  // Government / statutory authorities
  const isGovernmentAuthority =
    normAuth.includes("ministry") ||
    normAuth.includes("department") ||
    normAuth.includes("niti aayog") ||
    normAuth.includes("board") ||
    normAuth.includes("commission") ||
    normAuth.includes("nrsc") ||
    normAuth.includes("isro") ||
    normAuth.includes("statutory") ||
    normAuth.includes("government") ||
    normAuth.includes("dolr") ||
    normAuth.includes("cgwb") ||
    normAuth.includes("cwc") ||
    normAuth.includes("mohua") ||
    normAuth.includes("judicial") ||
    normAuth.includes("survey") ||
    normAuth.includes("authority");

  if (isResearchInstitution && !normAuth.includes("national judicial academy")) {
    return "research";
  }
  if (isGovernmentAuthority) {
    return "government";
  }
  return "other";
}

export async function GET() {
  try {
    const db = getDb();

    // 1. Evidence records calculations
    const allEvidence = await db.select().from(evidence).all();
    const totalEvidence = allEvidence.length;
    const verifiedEvidenceCount = allEvidence.filter((e) => e.verified === 1).length;
    const verificationRate = totalEvidence > 0 ? (verifiedEvidenceCount / totalEvidence) * 100 : 0;

    // Categorize evidence records by authority type
    let govCount = 0;
    let researchCount = 0;
    let otherCount = 0;

    for (const e of allEvidence) {
      const cat = classifyEvidenceSource(e.authority, e.type);
      if (cat === "government") govCount++;
      else if (cat === "research") researchCount++;
      else otherCount++;
    }

    const govShare = totalEvidence > 0 ? Math.round((govCount / totalEvidence) * 100) : 0;
    const researchShare = totalEvidence > 0 ? Math.round((researchCount / totalEvidence) * 100) : 0;
    const otherShare = totalEvidence > 0 ? Math.max(0, 100 - govShare - researchShare) : 0;

    // 2. Policy studies calculations
    const studiesRows = await db.select().from(policyStudies).all();
    const totalStudies = studiesRows.length;

    // 3. District calculations
    const districtsRows = await db.select().from(districts).all();
    const totalDistricts = districtsRows.length;

    // 4. Evidence records by publication year
    const yearCounts: Record<number, number> = {};
    for (const e of allEvidence) {
      if (typeof e.year === "number") {
        yearCounts[e.year] = (yearCounts[e.year] || 0) + 1;
      }
    }
    const yearlyEvidence = Object.entries(yearCounts)
      .map(([yr, count]) => ({ year: Number(yr), count }))
      .sort((a, b) => a.year - b.year);

    // 5. Dynamic pilot KPI metrics
    const metrics = [
      {
        key: "evidence_assets",
        label: "Pilot evidence records",
        value: String(totalEvidence),
        delta: "Curated pilot repository",
        tone: "blue",
        icon: "BookOpen",
      },
      {
        key: "active_studies",
        label: "Pilot policy studies",
        value: String(totalStudies),
        delta: "Demonstration scenarios",
        tone: "saffron",
        icon: "Landmark",
      },
      {
        key: "districts_covered",
        label: "Pilot districts",
        value: String(totalDistricts),
        delta: "6 pilot geographies",
        tone: "green",
        icon: "Globe2",
      },
      {
        key: "verified_sources",
        label: "Pilot evidence verified",
        value: `${Math.round(verificationRate)}%`,
        delta: "Provenance authenticated",
        tone: "navy",
        icon: "ShieldCheck",
      },
    ];

    const formattedStudies = studiesRows.map((s) => ({
      id: s.id,
      title: s.title,
      state: s.state,
      district: s.district,
      stage: s.stage,
      stageKey: s.stageKey,
      score: s.readinessScore,
      owner: s.owner,
      summary: s.summary,
      priority: s.priority,
    }));

    return NextResponse.json({
      metrics,
      summary: {
        evidenceCount: totalEvidence,
        studiesCount: totalStudies,
        districtsCount: totalDistricts,
        verificationRate: Math.round(verificationRate),
        governmentShare: govShare,
        researchShare: researchShare,
        otherShare: otherShare,
      },
      studies: formattedStudies,
      yearlyEvidence,
      trend: yearlyEvidence.map((y) => y.count),
      quality: {
        verified: Math.round(verificationRate),
        breakdown: [
          {
            key: "government",
            label: "Government / Statutory",
            share: govShare,
            count: govCount,
            colorClass: "l1",
          },
          {
            key: "research",
            label: "Research / Academic",
            share: researchShare,
            count: researchCount,
            colorClass: "l2",
          },
          {
            key: "other",
            label: "Other validated",
            share: otherShare,
            count: otherCount,
            colorClass: "l3",
          },
        ],
      },
      scope: {
        type: "pilot",
        districtsCount: totalDistricts,
        evidenceCount: totalEvidence,
        notice:
          "NIRNAYA currently operates on a curated six-district pilot dataset. Official government sources are integrated where publicly accessible; restricted systems require authorization.",
      },
      snapshot: "2026-09-23",
      mode: "pilot-database-backed",
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "Failed to load dashboard metrics from database." },
      { status: 500 }
    );
  }
}
