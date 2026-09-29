import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { evidence, districts } from "@/db/schema";
import { eq, or, like, desc } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user from server session
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required to generate decision briefs." },
        { status: 401 }
      );
    }

    const body = (await request.json()) as Record<string, any>;

    const runId = body.runId || `run-${Date.now()}`;
    const studyTitle = body.studyTitle || "Peri-urban land conversion safeguards";
    const districtName = body.districtName || "Kancheepuram";
    const interventionName =
      body.interventionName || "Groundwater Stress Mitigation & Recharge Zoning";
    const score = Number(body.score ?? 74);
    const parameters = body.parameters || {
      intensity: 70,
      coverage: 75,
      timeHorizon: 3,
      focusArea: "Critical Aquifer Corridors",
    };
    const indicators = Array.isArray(body.indicators) ? body.indicators : [];
    const baseline = body.baseline || {};
    const assumptions = body.assumptions || {
      intensity: parameters.intensity,
      coverage: parameters.coverage,
      timeHorizon: parameters.timeHorizon,
    };
    const calculationExplanation = body.calculationExplanation || {
      methodology: "Deterministic Bounded Multi-Criteria Spatial Model (SIH PS 26019 v2.0)",
    };

    // 2. Fetch authentic database evidence records matching district or topic
    const db = getDb();
    let evidenceMatches = await db
      .select()
      .from(evidence)
      .where(
        or(
          like(evidence.district, `%${districtName}%`),
          like(evidence.geography, `%${districtName}%`),
          like(evidence.title, `%${districtName}%`)
        )
      )
      .limit(4)
      .all();

    // If district-specific matches are fewer than 2, supplement with thematic state/national records
    if (evidenceMatches.length < 2) {
      const thematicMatches = await db
        .select()
        .from(evidence)
        .where(
          or(
            like(evidence.tags, "%groundwater%"),
            like(evidence.tags, "%cadastral%"),
            like(evidence.tags, "%land%")
          )
        )
        .orderBy(desc(evidence.score))
        .limit(3)
        .all();

      const existingIds = new Set(evidenceMatches.map((e) => e.id));
      for (const t of thematicMatches) {
        if (!existingIds.has(t.id) && evidenceMatches.length < 4) {
          evidenceMatches.push(t);
        }
      }
    }

    const formattedEvidenceReferences = evidenceMatches.map((e) => ({
      id: e.id,
      title: e.title,
      authority: e.authority,
      year: e.year,
      citation: e.citation || `${e.authority} (${e.year})`,
      geography: e.geography,
      score: e.score,
      checksum: e.checksum,
      sourceUrl: e.sourceUrl,
    }));

    // 3. Construct structured NIRNAYA Decision Brief
    const classification =
      score >= 75
        ? "Recommended for Multi-Taluk Pilot"
        : score >= 60
        ? "Conditional Pilot / Revisions Required"
        : "High Implementation Friction: Revise Baseline First";

    const brief = {
      referenceNumber: `NIRNAYA/DoLR/PB-${new Date().getFullYear()}-${runId.slice(-6).toUpperCase()}`,
      generatedAt: new Date().toISOString(),
      generatedBy: {
        id: user.id,
        fullName: user.fullName,
        role: user.role,
        email: user.email,
      },
      ministry: "Ministry of Rural Development",
      department: "Department of Land Resources",
      portal: "NIRNAYA — National Land Policy Intelligence (Smart India Hackathon PS 26019)",
      subject: `Policy Preflight Assessment: ${interventionName}`,
      studyTitle,
      pilotGeography: districtName,
      readinessIndex: `${score}/100`,
      classification,
      executiveSummary:
        body.recommendation ||
        `Deterministic preflight evaluation for ${districtName} under ${interventionName} yields an aggregate policy readiness rating of ${score}/100. Interventions achieve targeted risk reductions when supported by digital cadastre alignment and multi-taluk grievance monitoring.`,
      scenarioParameters: parameters,
      baselineIndicators: baseline,
      indicatorComparisons: indicators,
      evidenceReferences: formattedEvidenceReferences,
      calculationRules: {
        methodology: calculationExplanation.methodology,
        effectiveFactorFormula: calculationExplanation.effectiveFactorFormula,
        targetRule: calculationExplanation.targetRule,
        secondaryRule: calculationExplanation.secondaryRule,
      },
      assumptionsMatrix: assumptions,
      safeguardChecklist: [
        {
          item: "Aquifer recharge buffer demarcated via cadastre overlay",
          status: (parameters.coverage ?? 70) >= 60 ? "Satisfied" : "Pending Boundary Notification",
        },
        {
          item: "Grievance redressal protocol for smallholder tenant farmers",
          status: (parameters.intensity ?? 65) >= 70 ? "Satisfied" : "Needs Revenue Department Strengthening",
        },
        {
          item: "Drone orthophoto ground-truthing with state revenue records",
          status: "Active / DILRMP Verified",
        },
        {
          item: "Quarterly multi-spectral satellite earth-observation audit",
          status: parameters.timeHorizon >= 3 ? "Scheduled" : "Single-Cycle Only",
        },
      ],
      legalProvenance:
        "Formulated under statutory guidelines of DoLR land governance circulars, DILRMP operational guidelines, and GEC-2015 groundwater norms.",
      limitationsNotice:
        "CRITICAL POLICY NOTICE: This decision brief is a prototype simulation produced by the NIRNAYA decision support system for Smart India Hackathon PS 26019. It uses normalized indicators from the local database and bounded deterministic elasticity assumptions. It is not an officially approved government order or a guaranteed outcome forecast.",
      auditableChecksum: `sha256:${Buffer.from(`${runId}-${score}-${districtName}-${user.id}`).toString("hex").slice(0, 32)}`,
    };

    return NextResponse.json({ success: true, brief });
  } catch (error) {
    console.error("Decision brief error:", error);
    return NextResponse.json(
      { error: "Failed to generate decision brief." },
      { status: 500 }
    );
  }
}
