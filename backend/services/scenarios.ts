export type TimeHorizon = 1 | 3 | 5;

export type ScenarioParameters = {
  intensity: number; // 10 - 100 (%)
  coverage: number;  // 10 - 100 (%)
  timeHorizon: TimeHorizon; // 1, 3, or 5 years
  focusArea?: string;
};

export type PolicyIntervention = {
  id: string;
  name: string;
  category: string;
  targetMetric: string;
  description: string;
  disclaimer: string;
  defaultParameters: ScenarioParameters;
  statutoryBasis: string;
};

export type DistrictBaseline = {
  id: string;
  name: string;
  state: string;
  compositeRisk: number;
  riskLevel: string;
  groundwaterStress: number;
  builtUpExpansion: number;
  livelihoodSensitivity: number;
  landDisputeIntensity: number;
  dataCompleteness: number; // Land-record digitization %
};

export type IndicatorComparison = {
  key: string;
  label: string;
  unit: string;
  baseline: number;
  scenario: number;
  absoluteChange: number; // scenario - baseline
  percentChange: number;   // ((scenario - baseline) / baseline) * 100
  direction: "improved" | "neutral" | "worsened";
  higherIsBetter: boolean;
};

export type DirectionalImpact = {
  name: string;
  value: number;
  percent?: number;
  baseline?: number;
  scenario?: number;
  unit?: string;
  direction?: "improved" | "neutral" | "worsened";
};

export type ScenarioCalculationResult = {
  runId: string;
  districtId: string;
  districtName: string;
  state: string;
  studyId: string;
  studyName: string;
  interventionId: string;
  interventionName: string;
  parameters: ScenarioParameters;
  effectiveInterventionFactor: number;
  baseline: DistrictBaseline;
  score: number;
  readinessScore: number;
  readinessVerdict: string;
  baselineCompositeRisk: number;
  scenarioCompositeRisk: number;
  baselineRiskLevel: string;
  scenarioRiskLevel: string;
  sliders: {
    conservation: number;
    livelihood: number;
    feasibility: number;
    water: number;
  };
  impacts: DirectionalImpact[];
  indicators: IndicatorComparison[];
  calculationExplanation: {
    methodology: string;
    effectiveFactorFormula: string;
    targetRule: string;
    secondaryRule: string;
    assumptionsUsed: string[];
    disclaimer: string;
  };
  recommendation: string;
  createdAt: string;
};

export const AVAILABLE_INTERVENTIONS: PolicyIntervention[] = [
  {
    id: "interv-groundwater",
    name: "Groundwater Stress Mitigation & Recharge Zoning",
    category: "Natural Resource Conservation",
    targetMetric: "Water resilience",
    description:
      "Statutory demarcation of critical aquifer recharge sanctuaries, regulated extraction permits for commercial borewells, and community rainwater retention mandates.",
    disclaimer:
      "Prototype scenario model input formulated for Smart India Hackathon PS 26019. Not an officially gazetted government policy scheme.",
    defaultParameters: {
      intensity: 75,
      coverage: 70,
      timeHorizon: 3,
      focusArea: "Critical Aquifer Corridors",
    },
    statutoryBasis: "Central Ground Water Authority (CGWA) guidelines and Model Bill for Groundwater Management.",
  },
  {
    id: "interv-digitization",
    name: "Land-Record Modernization & Cadastre Digitization",
    category: "Tenure Security & Administration",
    targetMetric: "Administrative feasibility",
    description:
      "Accelerated resurvey using high-resolution drone orthophotos, end-to-end integration of spatial cadastral boundaries with RoR (Record of Rights), and automated mutation registries.",
    disclaimer:
      "Prototype scenario model input formulated for Smart India Hackathon PS 26019. Simulates accelerated DILRMP rollout.",
    defaultParameters: {
      intensity: 80,
      coverage: 85,
      timeHorizon: 3,
      focusArea: "Rural & Peri-Urban Taluks",
    },
    statutoryBasis: "Digital India Land Records Modernization Programme (DILRMP) core standards.",
  },
  {
    id: "interv-urban-expansion",
    name: "Urban Growth Boundary & Peri-Urban Protection",
    category: "Spatial Planning & Land Use",
    targetMetric: "Environmental protection",
    description:
      "Implementation of statutory urban containment boundaries, mandatory ecological buffers around agricultural belts, and transfer of development rights (TDR) for farmland preservation.",
    disclaimer:
      "Prototype scenario model input formulated for Smart India Hackathon PS 26019. Decision-exploration simulation only.",
    defaultParameters: {
      intensity: 65,
      coverage: 60,
      timeHorizon: 5,
      focusArea: "Metropolitan Periphery",
    },
    statutoryBasis: "URDPFI Guidelines (Ministry of Housing and Urban Affairs) & DoLR Peri-Urban Land Directives.",
  },
  {
    id: "interv-dispute-reduction",
    name: "Land Dispute Resolution & Revenue Court Fast-Tracking",
    category: "Legal & Dispute Redressal",
    targetMetric: "Administrative feasibility",
    description:
      "Establishment of digital revenue dispute registries, lok adalat boundary reconciliation drives, and AI-assisted land title chain verification.",
    disclaimer:
      "Prototype scenario model input formulated for Smart India Hackathon PS 26019. Simulates judicial-administrative acceleration.",
    defaultParameters: {
      intensity: 70,
      coverage: 75,
      timeHorizon: 3,
      focusArea: "Revenue Courts & Sub-Registrar Offices",
    },
    statutoryBasis: "DoLR Model Land Dispute Redressal Protocol & Department of Justice Fast-Track Mechanisms.",
  },
  {
    id: "interv-livelihood",
    name: "Smallholder Livelihood Safeguards & Land Transition",
    category: "Social Safeguards & Equity",
    targetMetric: "Livelihood safeguards",
    description:
      "Fair compensation escrows for land acquisition, mandatory rehabilitation packages, collective tenancy recognition, and land-pooling benefit share for marginal farmers.",
    disclaimer:
      "Prototype scenario model input formulated for Smart India Hackathon PS 26019. Simulates RFCTLARR implementation elasticity.",
    defaultParameters: {
      intensity: 80,
      coverage: 65,
      timeHorizon: 3,
      focusArea: "Agrarian Households & Tenant Farmers",
    },
    statutoryBasis: "Right to Fair Compensation and Transparency in Land Acquisition, Rehabilitation and Resettlement Act (RFCTLARR).",
  },
];

export const clamp = (val: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, Math.round(val)));
};

export function getRiskLevel(score: number): "Low" | "Moderate" | "High" | "Critical" {
  if (score >= 75) return "Critical";
  if (score >= 60) return "High";
  if (score >= 40) return "Moderate";
  return "Low";
}

/**
 * Deterministic, explainable scenario calculation engine.
 * Directly factors in:
 * 1. Environmental protection (conservation slider, default 65%)
 * 2. Livelihood safeguards (livelihood slider, default 72%)
 * 3. Administrative feasibility (feasibility slider, default 58%)
 * 4. Water resilience (water slider, default 80%)
 * 5. District baseline indicators from database (compositeRisk, groundwater, built-up, livelihood, disputes, completeness)
 * 6. Policy study baseline readiness from database
 * 
 * Flexible signature supports both direct slider object calls and legacy positional calls.
 */
export function calculateScenario(
  baseline: DistrictBaseline,
  sliderValuesOrIntervention?:
    | {
        conservation?: number;
        livelihood?: number;
        feasibility?: number;
        water?: number;
      }
    | string,
  studyInfoOrParams?:
    | {
        id?: string;
        title?: string;
        readinessScore?: number;
      }
    | ScenarioParameters,
  interventionIdOrParams?: string | ScenarioParameters,
  explicitParams?: ScenarioParameters
): ScenarioCalculationResult {
  // Determine if called with legacy signature (baseline, interventionId: string, params: ScenarioParameters)
  let interventionId = "interv-groundwater";
  let sliderValues = { conservation: 65, livelihood: 72, feasibility: 58, water: 80 };
  let studyInfo = {
    id: "ps-001",
    title: "Peri-urban land conversion safeguards",
    readinessScore: 78,
  };
  let params: ScenarioParameters = {
    intensity: 75,
    coverage: 70,
    timeHorizon: 3,
    focusArea: "Critical Aquifer Corridors",
  };

  if (typeof sliderValuesOrIntervention === "string") {
    interventionId = sliderValuesOrIntervention;
    if (studyInfoOrParams && "intensity" in studyInfoOrParams) {
      params = studyInfoOrParams as ScenarioParameters;
      const scale = (params.intensity / 75 + params.coverage / 70) / 2;
      sliderValues = {
        conservation: clamp(Math.round(65 * scale), 10, 100),
        livelihood: clamp(Math.round(72 * scale), 10, 100),
        feasibility: clamp(Math.round(58 * scale), 10, 100),
        water: clamp(Math.round(80 * scale), 10, 100),
      };
    }
  } else if (typeof sliderValuesOrIntervention === "object" && sliderValuesOrIntervention !== null) {
    sliderValues = {
      conservation: sliderValuesOrIntervention.conservation ?? 65,
      livelihood: sliderValuesOrIntervention.livelihood ?? 72,
      feasibility: sliderValuesOrIntervention.feasibility ?? 58,
      water: sliderValuesOrIntervention.water ?? 80,
    };

    if (studyInfoOrParams && "title" in studyInfoOrParams) {
      studyInfo = {
        id: studyInfoOrParams.id || "ps-001",
        title: studyInfoOrParams.title || "Peri-urban land conversion safeguards",
        readinessScore: studyInfoOrParams.readinessScore ?? 78,
      };
    } else if (studyInfoOrParams && "intensity" in studyInfoOrParams) {
      params = studyInfoOrParams as ScenarioParameters;
    }

    if (typeof interventionIdOrParams === "string") {
      interventionId = interventionIdOrParams;
    } else if (typeof interventionIdOrParams === "object" && interventionIdOrParams !== null && "intensity" in interventionIdOrParams) {
      params = interventionIdOrParams as ScenarioParameters;
    }

    if (explicitParams && "intensity" in explicitParams) {
      params = explicitParams;
    }
  }

  const C = clamp(sliderValues.conservation, 0, 100);
  const L = clamp(sliderValues.livelihood, 0, 100);
  const F = clamp(sliderValues.feasibility, 0, 100);
  const W = clamp(sliderValues.water, 0, 100);

  const intervention =
    AVAILABLE_INTERVENTIONS.find((i) => i.id === interventionId) || AVAILABLE_INTERVENTIONS[0];

  const timeFactor = params.timeHorizon === 1 ? 0.55 : params.timeHorizon === 5 ? 1.0 : 0.85;
  const effectiveInterventionFactor =
    Math.round((params.intensity / 100) * (params.coverage / 100) * timeFactor * 100) / 100;

  // 1. Calculate Policy Readiness Score
  // Weights: Conservation (28%), Livelihood (24%), Feasibility (22%), Water (26%)
  // Modulated by Study Institutional Readiness ((studyInfo.readinessScore - 70) * 0.15)
  // Modulated by District Baseline Vulnerability ((75 - baseline.compositeRisk) * 0.12)
  const weightedSliderSum = C * 0.28 + L * 0.24 + F * 0.22 + W * 0.26;
  const studyModulation = (studyInfo.readinessScore - 70) * 0.15;
  const districtModulation = (75 - baseline.compositeRisk) * 0.12;

  const rawScore = weightedSliderSum + studyModulation + districtModulation;
  const score = clamp(Math.round(rawScore), 10, 100);

  // 2. Projected Directional Impacts (reflecting all 4 slider dimensions)
  const waterImpact = clamp(Math.round(W * 0.28 + (100 - baseline.groundwaterStress) * 0.08), 5, 45);
  const farmlandImpact = clamp(Math.round(C * 0.26 + (100 - baseline.builtUpExpansion) * 0.06), 5, 40);
  const livelihoodImpact = clamp(Math.round(L * 0.24 + (100 - baseline.livelihoodSensitivity) * 0.06), 5, 40);
  
  // Delivery complexity: At high feasibility (100%), delivery friction drops to 0.
  // At lower feasibility, negative friction increases.
  const deliveryFriction = Math.max(0, Math.round((100 - F) * 0.22 - (studyInfo.readinessScore - 50) * 0.08));
  const deliveryImpact = -deliveryFriction;

  const impacts: DirectionalImpact[] = [
    { name: "Water resilience", value: waterImpact },
    { name: "Farmland retention", value: farmlandImpact },
    { name: "Livelihood security", value: livelihoodImpact },
    { name: "Delivery complexity", value: deliveryImpact },
  ];

  // 3. Projected Baseline vs Scenario Indicator Shifts
  const scenarioGw = clamp(
    baseline.groundwaterStress - Math.round((W / 100) * 0.30 * baseline.groundwaterStress),
    10,
    100
  );
  const scenarioBuilt = clamp(
    baseline.builtUpExpansion - Math.round((C / 100) * 0.25 * baseline.builtUpExpansion),
    10,
    100
  );
  const scenarioLiv = clamp(
    baseline.livelihoodSensitivity - Math.round((L / 100) * 0.25 * baseline.livelihoodSensitivity),
    10,
    100
  );
  const scenarioDisp = clamp(
    baseline.landDisputeIntensity - Math.round((F / 100) * 0.28 * baseline.landDisputeIntensity),
    10,
    100
  );
  const scenarioComp = clamp(
    baseline.dataCompleteness + Math.round((F / 100) * 0.40 * (100 - baseline.dataCompleteness)),
    0,
    98
  );

  const scenarioCompositeRisk = clamp(
    Math.round(
      0.28 * scenarioGw +
        0.22 * scenarioBuilt +
        0.22 * scenarioLiv +
        0.18 * scenarioDisp +
        0.10 * (100 - scenarioComp)
    ),
    5,
    100
  );

  const baselineRiskLevel = getRiskLevel(baseline.compositeRisk);
  const scenarioRiskLevel = getRiskLevel(scenarioCompositeRisk);

  const readinessVerdict =
    score >= 75
      ? "Recommended for Multi-Taluk Pilot"
      : score >= 60
      ? "Conditional Pilot / Revisions Required"
      : "High Implementation Friction: Revise Baseline Safeguards First";

  const recommendation =
    score >= 75
      ? `Proceed to a multi-taluk district pilot in ${baseline.name} with aquifer-recharge buffers, mandatory livelihood transition allowances, and quarterly satellite monitoring under ${studyInfo.title}.`
      : score >= 60
      ? `Conduct an administrative readiness revision in ${baseline.name} to enhance inter-departmental revenue coordination before authorising field pilot.`
      : `High implementation friction: Priority must be given to strengthening baseline land tenure certainty and community safeguards in ${baseline.name} before zoning controls.`;

  const indicators: IndicatorComparison[] = [
    buildComparison("groundwaterStress", "Groundwater Stress", "%", baseline.groundwaterStress, scenarioGw, false),
    buildComparison("builtUpExpansion", "Built-up Expansion", "%", baseline.builtUpExpansion, scenarioBuilt, false),
    buildComparison("livelihoodSensitivity", "Livelihood Vulnerability", "%", baseline.livelihoodSensitivity, scenarioLiv, false),
    buildComparison("landDisputeIntensity", "Land Dispute Index", "%", baseline.landDisputeIntensity, scenarioDisp, false),
    buildComparison("dataCompleteness", "Land Records Digitization", "%", baseline.dataCompleteness, scenarioComp, true),
    buildComparison("compositeRisk", "Composite Risk Score", "%", baseline.compositeRisk, scenarioCompositeRisk, false),
  ];

  return {
    runId: `run-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    districtId: baseline.id,
    districtName: baseline.name,
    state: baseline.state,
    studyId: studyInfo.id,
    studyName: studyInfo.title,
    interventionId: intervention.id,
    interventionName: intervention.name,
    parameters: params,
    effectiveInterventionFactor,
    baseline,
    score,
    readinessScore: score,
    readinessVerdict,
    baselineCompositeRisk: baseline.compositeRisk,
    scenarioCompositeRisk,
    baselineRiskLevel,
    scenarioRiskLevel,
    sliders: {
      conservation: C,
      livelihood: L,
      feasibility: F,
      water: W,
    },
    impacts,
    indicators,
    calculationExplanation: {
      methodology: "Weighted Multi-Criteria Spatial Decision Model (NIRNAYA v2.1)",
      effectiveFactorFormula: `Score = (${C}% × 0.28) + (${L}% × 0.24) + (${F}% × 0.22) + (${W}% × 0.26) + StudyAdj(${studyModulation > 0 ? "+" : ""}${studyModulation.toFixed(1)}) + DistrictAdj(${districtModulation > 0 ? "+" : ""}${districtModulation.toFixed(1)}) = ${score}/100`,
      targetRule: `Administrative Feasibility (${F}%) directly modulates Delivery Complexity (${deliveryImpact}%), Dispute Index (-${Math.round((F / 100) * 0.28 * baseline.landDisputeIntensity)}%), and Cadastre Digitization (+${Math.round((F / 100) * 0.40 * (100 - baseline.dataCompleteness))}%).`,
      secondaryRule: `Environmental (${C}%) and Water (${W}%) priorities scale Farmland Retention (+${farmlandImpact}%) and Groundwater Resilience (+${waterImpact}%).`,
      assumptionsUsed: [
        `Baseline indicators queried directly from NIRNAYA SQLite districts database for ${baseline.name}.`,
        `Selected Policy Study '${studyInfo.title}' contributes institutional baseline readiness of ${studyInfo.readinessScore}/100.`,
        `Administrative feasibility weight (22%) directly governs public revenue department implementation friction.`,
      ],
      disclaimer:
        "Model-based prototype scenario estimate. For decision exploration and preflight policy testing under Smart India Hackathon PS 26019. Not an official government forecast or legally binding causal guarantee.",
    },
    recommendation,
    createdAt: new Date().toISOString(),
  };
}

function buildComparison(
  key: string,
  label: string,
  unit: string,
  baseline: number,
  scenario: number,
  higherIsBetter: boolean
): IndicatorComparison {
  const absoluteChange = scenario - baseline;
  const percentChange =
    baseline !== 0 ? Math.round(((scenario - baseline) / baseline) * 1000) / 10 : 0;

  let direction: "improved" | "neutral" | "worsened" = "neutral";
  if (absoluteChange !== 0) {
    if (higherIsBetter) {
      direction = absoluteChange > 0 ? "improved" : "worsened";
    } else {
      direction = absoluteChange < 0 ? "improved" : "worsened";
    }
  }

  return {
    key,
    label,
    unit,
    baseline,
    scenario,
    absoluteChange,
    percentChange,
    direction,
    higherIsBetter,
  };
}
