import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { scenarioRuns, policyStudies, districts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import {
  calculateScenario,
  AVAILABLE_INTERVENTIONS,
  type DistrictBaseline,
  type ScenarioParameters,
} from "@/lib/scenarios";

const clamp = (n: unknown, min = 10, max = 100, def = 65) => {
  const num = Number(n);
  return Math.max(min, Math.min(max, Number.isFinite(num) ? num : def));
};

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user from server session
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required to run policy scenarios." },
        { status: 401 }
      );
    }

    const rawBody = (await request.json()) as Record<string, unknown>;

    const studyId = typeof rawBody.studyId === "string" ? rawBody.studyId : "ps-001";
    const geographyId =
      typeof rawBody.geographyId === "string" ? rawBody.geographyId : "dist-kancheepuram";
    const interventionId =
      typeof rawBody.interventionId === "string"
        ? rawBody.interventionId
        : "interv-groundwater";

    const params: ScenarioParameters = {
      intensity: clamp(rawBody.intensity, 10, 100, 70),
      coverage: clamp(rawBody.coverage, 10, 100, 75),
      timeHorizon:
        rawBody.timeHorizon === 1 || rawBody.timeHorizon === 5 ? (rawBody.timeHorizon as 1 | 5) : 3,
      focusArea: typeof rawBody.focusArea === "string" ? rawBody.focusArea : undefined,
    };

    // 2. Query database for District Baseline
    const db = getDb();
    const districtRows = await db
      .select()
      .from(districts)
      .where(eq(districts.id, geographyId))
      .all();

    if (districtRows.length === 0) {
      return NextResponse.json(
        { error: `District not found with ID: ${geographyId}` },
        { status: 404 }
      );
    }

    const districtRow = districtRows[0];
    const baseline: DistrictBaseline = {
      id: districtRow.id,
      name: districtRow.name,
      state: districtRow.state,
      compositeRisk: districtRow.compositeRisk,
      riskLevel: districtRow.riskLevel,
      groundwaterStress: districtRow.groundwaterStress,
      builtUpExpansion: districtRow.builtUpExpansion,
      livelihoodSensitivity: districtRow.livelihoodSensitivity,
      landDisputeIntensity: districtRow.landDisputeIntensity,
      dataCompleteness: districtRow.dataCompleteness,
    };

    // 3. Query database for Policy Study (institutional readiness baseline)
    const studyRows = await db
      .select()
      .from(policyStudies)
      .where(eq(policyStudies.id, studyId))
      .all();
    const studyRow = studyRows[0];
    const studyInfo = studyRow
      ? {
          id: studyRow.id,
          title: studyRow.title,
          readinessScore: studyRow.readinessScore,
        }
      : {
          id: "ps-001",
          title: "Peri-urban land conversion safeguards",
          readinessScore: 78,
        };

    // Extract all 4 sliders with authentic defaults
    const conservation = clamp(rawBody.conservation, 0, 100, 65);
    const livelihood = clamp(rawBody.livelihood, 0, 100, 72);
    const feasibility = clamp(rawBody.feasibility, 0, 100, 58);
    const water = clamp(rawBody.water, 0, 100, 80);

    // 4. Execute Deterministic Scenario Calculation Engine
    const calculation = calculateScenario(
      baseline,
      { conservation, livelihood, feasibility, water },
      studyInfo,
      interventionId,
      params
    );

    const assumptions = {
      intensity: calculation.parameters.intensity,
      coverage: calculation.parameters.coverage,
      timeHorizon: calculation.parameters.timeHorizon,
      effectiveFactor: calculation.effectiveInterventionFactor,
      conservation,
      livelihood,
      feasibility,
      water,
    };

    // 5. Persist to Database with Authenticated User ID
    await db.insert(scenarioRuns).values({
      id: calculation.runId,
      userId: user.id,
      studyId: studyInfo.id,
      geographyId: calculation.districtId,
      districtName: calculation.districtName,
      interventionId: calculation.interventionId,
      interventionName: calculation.interventionName,
      conservation,
      livelihood,
      feasibility,
      water,
      score: calculation.readinessScore,
      method: "deterministic-bounded-v2.1",
      recommendation: calculation.recommendation,
      impacts: JSON.stringify(calculation.impacts),
      assumptions: JSON.stringify(assumptions),
      parameters: JSON.stringify(calculation.parameters),
      baselineData: JSON.stringify(baseline),
      scenarioData: JSON.stringify({
        compositeRisk: calculation.scenarioCompositeRisk,
        riskLevel: calculation.scenarioRiskLevel,
        readinessScore: calculation.readinessScore,
        indicators: calculation.indicators,
      }),
      evidenceSnapshot: "2026-09-23",
      createdAt: calculation.createdAt,
    });

    // 6. Return complete structured response
    return NextResponse.json({
      success: true,
      runId: calculation.runId,
      studyId: studyInfo.id,
      studyName: studyInfo.title,
      geographyId: calculation.districtId,
      districtName: calculation.districtName,
      state: calculation.state,
      interventionId: calculation.interventionId,
      interventionName: calculation.interventionName,
      parameters: calculation.parameters,
      effectiveInterventionFactor: calculation.effectiveInterventionFactor,
      baselineCompositeRisk: calculation.baselineCompositeRisk,
      scenarioCompositeRisk: calculation.scenarioCompositeRisk,
      baselineRiskLevel: calculation.baselineRiskLevel,
      scenarioRiskLevel: calculation.scenarioRiskLevel,
      score: calculation.readinessScore,
      readinessScore: calculation.readinessScore,
      readinessVerdict: calculation.readinessVerdict,
      sliders: calculation.sliders,
      recommendation: calculation.recommendation,
      indicators: calculation.indicators,
      calculationExplanation: calculation.calculationExplanation,
      impacts: calculation.impacts,
      assumptions,
      baseline,
      availableInterventions: AVAILABLE_INTERVENTIONS,
      evidenceSnapshot: "2026-09-23",
      createdAt: calculation.createdAt,
    });
  } catch (error) {
    console.error("Scenario run error:", error);
    return NextResponse.json(
      { error: "Failed to execute and persist policy scenario." },
      { status: 500 }
    );
  }
}
