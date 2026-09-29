import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { scenarioRuns } from "@/db/schema";
import { desc, eq, or, isNull } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  try {
    // 1. Authenticate user from server session
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required to retrieve scenario history." },
        { status: 401 }
      );
    }

    const db = getDb();
    // Retrieve runs belonging to this user, or global demonstration runs
    const rows = await db
      .select()
      .from(scenarioRuns)
      .where(or(eq(scenarioRuns.userId, user.id), isNull(scenarioRuns.userId)))
      .orderBy(desc(scenarioRuns.createdAt))
      .limit(30)
      .all();

    const formatted = rows.map((r) => {
      const safeParse = (val: unknown, fallback: any = null) => {
        if (!val) return fallback;
        if (typeof val === "object") return val;
        if (typeof val === "string") {
          try {
            return JSON.parse(val);
          } catch {
            return fallback;
          }
        }
        return fallback;
      };

      const parsedImpacts = safeParse(r.impacts, []);
      const parsedAssumptions = safeParse(r.assumptions, {});
      const parsedParameters = safeParse(r.parameters, null);
      const parsedBaseline = safeParse(r.baselineData, null);
      const parsedScenario = safeParse(r.scenarioData, null);

      return {
        id: r.id,
        runId: r.id,
        userId: r.userId,
        studyId: r.studyId,
        geographyId: r.geographyId,
        districtName: r.districtName,
        interventionId: r.interventionId,
        interventionName: r.interventionName,
        score: r.score,
        conservation: typeof r.conservation === "number" ? r.conservation : 65,
        livelihood: typeof r.livelihood === "number" ? r.livelihood : 72,
        feasibility: typeof r.feasibility === "number" ? r.feasibility : 58,
        water: typeof r.water === "number" ? r.water : 80,
        recommendation: r.recommendation,
        impacts: Array.isArray(parsedImpacts) ? parsedImpacts : [],
        assumptions: parsedAssumptions,
        parameters: parsedParameters,
        baselineData: parsedBaseline,
        scenarioData: parsedScenario,
        createdAt: r.createdAt,
      };
    });

    return NextResponse.json({
      success: true,
      history: formatted,
      total: formatted.length,
    });
  } catch (error) {
    console.error("Scenario history error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve scenario history." },
      { status: 500 }
    );
  }
}
