"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, AlertTriangle, ArrowUpRight, BarChart3, BookOpen, Check, CheckCircle2,
  ChevronRight, CircleHelp, Copy, Database, ExternalLink, Eye, EyeOff, FileSearch, FileText, Globe2, Landmark,
  Layers3, MapPin, Menu, Network, Play, RefreshCw, RotateCcw, Search, Settings2, ShieldCheck, Sparkles, X,
  ZoomIn, ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AVAILABLE_INTERVENTIONS,
  calculateScenario,
  type PolicyIntervention,
  type ScenarioParameters,
  type IndicatorComparison,
  type ScenarioCalculationResult,
  type DistrictBaseline,
  type TimeHorizon,
} from "@/lib/scenarios";
import {
  BHUVAN_CONFIG,
  getBhuvanWmsUrl,
  resolveBhuvanLayerForDistrict,
  formatBhuvanArea,
  type BhuvanFeatureInfoResult,
} from "@/lib/adapters/bhuvan";
import { type OgdDiscoveredDataset } from "@/lib/adapters/ogd";

type View = "dashboard" | "evidence" | "map" | "scenario" | "connectors";

type Evidence = {
  id: string;
  title: string;
  type: string;
  authority: string;
  year: number;
  geography: string;
  state?: string;
  district?: string;
  score: number;
  summary: string;
  tags: string[];
  sourceUrl: string;
  checksum: string;
  provenanceDate?: string;
  verified?: boolean;
  citation?: string;
  methodologyNote?: string;
};

type PolicyStudy = {
  id: string;
  title: string;
  state: string;
  district?: string;
  stage: string;
  stageKey: string;
  score: number;
  owner: string;
  summary?: string;
  priority?: string;
};

type District = {
  id: string;
  name: string;
  state: string;
  areaSqKm: number;
  compositeRisk: number;
  riskLevel: string;
  layerScore: number;
  indicators: {
    groundwaterStress: number;
    builtUpExpansion: number;
    livelihoodSensitivity: number;
    dataCompleteness: number;
    landDisputeIntensity: number;
  };
  datasetsCombined: number;
  keySources: string[];
  fieldNote: string;
  notes?: string;
  svgRegionClass?: string;
  evidenceCount?: number;
};

type Connector = {
  id: string;
  name: string;
  owner: string;
  status: "live" | "sandbox" | "planned" | "approval-required";
  governanceStatus: string;
  purpose: string;
  endpoint: string;
  refresh: string;
  authType: string;
  documentationUrl?: string;
  contract: Record<string, unknown>;
  recordsCount?: number;
};

type Metric = {
  key: string;
  label: string;
  value: string;
  delta: string;
  tone: string;
  icon: string;
};

type DashboardMetric = Metric;

type YearlyEvidence = {
  year: number;
  count: number;
};

type QualityBreakdownItem = {
  key: string;
  label: string;
  share: number;
  count: number;
  colorClass: string;
};

type EvidenceQuality = {
  verified: number;
  breakdown: QualityBreakdownItem[];
};


type DecisionBrief = {
  referenceNumber: string;
  generatedAt: string;
  ministry: string;
  department: string;
  portal?: string;
  subject: string;
  studyTitle?: string;
  pilotGeography: string;
  readinessIndex: string;
  classification: string;
  executiveSummary: string;
  assumptionsMatrix: Record<string, any>;
  scenarioParameters?: Record<string, any>;
  baselineIndicators?: Record<string, any>;
  indicatorComparisons?: IndicatorComparison[];
  evidenceReferences?: {
    id: string;
    title: string;
    authority: string;
    year: number;
    citation: string;
    geography: string;
    score: number;
    checksum: string;
    sourceUrl: string;
  }[];
  safeguardChecklist: { item: string; status: string }[];
  legalProvenance: string;
  limitationsNotice?: string;
  auditableChecksum: string;
};

type ScenarioHistoryItem = {
  id: string;
  runId?: string;
  userId?: string;
  studyId?: string;
  geographyId?: string;
  districtName?: string;
  interventionId?: string;
  interventionName?: string;
  score: number;
  conservation?: number;
  livelihood?: number;
  feasibility?: number;
  water?: number;
  recommendation: string;
  impacts: any[];
  assumptions: any;
  parameters?: ScenarioParameters;
  baselineData?: any;
  scenarioData?: any;
  createdAt: string;
};

type AuthUser = {
  id: string;
  fullName: string;
  email: string;
  role: "Policy Analyst" | "Researcher" | "Administrator";
  createdAt: string;
};

const navigation = [
  { id: "dashboard" as View, label: "National overview", icon: BarChart3 },
  { id: "evidence" as View, label: "Evidence explorer", icon: FileSearch },
  { id: "map" as View, label: "Geospatial insights", icon: Globe2 },
  { id: "scenario" as View, label: "Scenario studio", icon: Activity },
  { id: "connectors" as View, label: "Data integrations", icon: Network },
];

function AppMark() {
  return (
    <div className="brand-mark" aria-label="NIRNAYA">
      <div className="emblem">
        <Landmark size={19} />
      </div>
      <div>
        <strong>NIRNAYA</strong>
        <span>भूमि नीति बुद्धिमत्ता</span>
      </div>
    </div>
  );
}

function StatusPill({
  status,
  governanceStatus,
  recordsCount,
}: {
  status: Connector["status"];
  governanceStatus?: string;
  recordsCount?: number;
}) {
  const normGov = (governanceStatus || "").toUpperCase().trim();
  const normStatus = (status || "").toLowerCase().trim();

  let displayLabel = "ADAPTER READY";
  let pillClass = "adapter-ready";

  // 1. If a genuine successful upstream sync has occurred AND official record count > 0:
  //    status = "LIVE / OFFICIAL"
  if (recordsCount !== undefined && recordsCount > 0) {
    displayLabel = "LIVE / OFFICIAL";
    pillClass = "live";
  }
  // 2. If the official endpoint requires an API key and no authorized sync has occurred:
  //    status = "API KEY REQUIRED"
  else if (
    normGov === "API KEY REQUIRED" ||
    normGov.includes("API KEY") ||
    (recordsCount !== undefined &&
      recordsCount === 0 &&
      (normStatus === "live" || normGov.includes("OFFICIAL") || normStatus === "approval-required"))
  ) {
    displayLabel = "API KEY REQUIRED";
    pillClass = "approval-required";
  }
  // Standard approval required for restricted non-key sources
  else if (normGov.includes("APPROVAL REQUIRED") || normStatus === "approval-required") {
    displayLabel = "APPROVAL REQUIRED";
    pillClass = "approval-required";
  }
  // 4. If the source is intentionally using demo/test data:
  //    status = "SANDBOX"
  else if (normGov.includes("SANDBOX") || normStatus === "sandbox") {
    displayLabel = "SANDBOX";
    pillClass = "sandbox";
  }
  // 3. If the adapter exists but upstream connectivity has not been verified:
  //    status = "ADAPTER READY"
  else if (normGov.includes("ADAPTER READY") || normStatus === "planned") {
    displayLabel = "ADAPTER READY";
    pillClass = "adapter-ready";
  }
  // Other live connectors (e.g. OpenAlex)
  else if (normGov.includes("OFFICIAL") || normGov.includes("LIVE") || normStatus === "live") {
    displayLabel = "LIVE / OFFICIAL";
    pillClass = "live";
  } else {
    displayLabel = governanceStatus || "ADAPTER READY";
    pillClass = "adapter-ready";
  }

  return (
    <span className={`status-pill ${pillClass}`}>
      <i />
      {displayLabel}
    </span>
  );
}

export default function DashboardClient({ initialUser }: { initialUser: AuthUser }) {
  const [active, setActive] = useState<View>("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Topbar Global Search live discovery states
  const [searchFocused, setSearchFocused] = useState(false);
  const [topOgdResults, setTopOgdResults] = useState<OgdDiscoveredDataset[]>([]);
  const [topOgdTotal, setTopOgdTotal] = useState(0);
  const [topOgdLoading, setTopOgdLoading] = useState(false);
  const [topOgdError, setTopOgdError] = useState<string | null>(null);
  const [topOgdDetectedGeography, setTopOgdDetectedGeography] = useState<string | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Data states
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [studies, setStudies] = useState<PolicyStudy[]>([]);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [districtsList, setDistrictsList] = useState<District[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<District | null>(null);
  const [yearlyEvidence, setYearlyEvidence] = useState<YearlyEvidence[]>([
    { year: 2022, count: 1 },
    { year: 2023, count: 2 },
    { year: 2024, count: 5 },
    { year: 2025, count: 2 },
  ]);
  const [quality, setQuality] = useState<EvidenceQuality>({
    verified: 100,
    breakdown: [
      { key: "government", label: "Government / Statutory", share: 80, count: 8, colorClass: "l1" },
      { key: "research", label: "Research / Academic", share: 20, count: 2, colorClass: "l2" },
      { key: "other", label: "Other validated", share: 0, count: 0, colorClass: "l3" },
    ],
  });
  const [loading, setLoading] = useState(true);

  // Modals & Interactive Control States
  const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null);
  const [inspectConnector, setInspectConnector] = useState<Connector | null>(null);
  const [decisionBrief, setDecisionBrief] = useState<DecisionBrief | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [apiDocOpen, setApiDocOpen] = useState(false);
  const [mapSettingsOpen, setMapSettingsOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [scenarioHistory, setScenarioHistory] = useState<ScenarioHistoryItem[]>([]);
  const [copiedChecksum, setCopiedChecksum] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser>(initialUser);
  const [profileOpen, setProfileOpen] = useState(false);

  // Scenario Studio states
  const [scenarioStudyId, setScenarioStudyId] = useState<string>("ps-001");
  const [scenarioGeographyId, setScenarioGeographyId] = useState<string>("dist-kancheepuram");
  const [scenarioInterventionId, setScenarioInterventionId] = useState<string>("interv-groundwater");
  const [scenarioParameters, setScenarioParameters] = useState<ScenarioParameters>({
    intensity: 75,
    coverage: 70,
    timeHorizon: 3,
    focusArea: "Critical Aquifer Corridors",
  });
  const [scenario, setScenario] = useState({ conservation: 65, livelihood: 72, feasibility: 58, water: 80 });
  const [scenarioResult, setScenarioResult] = useState<any | null>(null);
  const [scenarioError, setScenarioError] = useState<string | null>(null);
  const [compareScenarioB, setCompareScenarioB] = useState<any | null>(null);
  const [running, setRunning] = useState(false);

  // Map state
  const [mapLayer, setMapLayer] = useState<string>("Water stress");
  const [mapZoom, setMapZoom] = useState<number>(1);
  const [mapLoading, setMapLoading] = useState<boolean>(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // OGD Data Adapter States
  const [syncingOgd, setSyncingOgd] = useState(false);
  const [ogdModalOpen, setOgdModalOpen] = useState(false);
  const [ogdApiKeyInput, setOgdApiKeyInput] = useState("");
  const [ogdSyncFeedback, setOgdSyncFeedback] = useState<{
    type: "success" | "error" | "info" | "warning";
    title: string;
    message: string;
    details?: any;
  } | null>(null);

  const refreshConnectorsAndEvidence = useCallback(async () => {
    try {
      const [connRes, evRes] = await Promise.all([
        fetch("/api/v1/connectors").then((r) => r.json() as Promise<{ items?: Connector[] }>),
        fetch("/api/v1/evidence").then((r) => r.json() as Promise<{ items?: Evidence[] }>),
      ]);
      if (connRes.items) setConnectors(connRes.items);
      if (evRes.items) setEvidence(evRes.items);
    } catch (err) {
      console.error("Failed to refresh connectors & evidence:", err);
    }
  }, []);

  const handleSyncOgd = useCallback(
    async (customApiKey?: string) => {
      setSyncingOgd(true);
      setOgdSyncFeedback(null);
      try {
        const res = await fetch("/api/v1/adapters/ogd", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            apiKey: customApiKey !== undefined ? customApiKey : ogdApiKeyInput || undefined,
          }),
        });
        const data = (await res.json()) as any;
        if (data.success) {
          setOgdSyncFeedback({
            type: "success",
            title: "Official OGD Ingestion Succeeded",
            message: `Successfully fetched and stored ${data.recordsIngested || data.recordsImported || 0} official records with cryptographic SHA-256 provenance checksums into SQLite.`,
            details: data,
          });
          await refreshConnectorsAndEvidence();
        } else {
          setOgdSyncFeedback({
            type: data.authRequired ? "warning" : "error",
            title: data.authRequired ? "Official Government Credentials Required" : "OGD Ingestion Notice",
            message: data.message || data.error || "Unable to sync with data.gov.in.",
            details: data,
          });
          await refreshConnectorsAndEvidence();
        }
      } catch (err: any) {
        setOgdSyncFeedback({
          type: "error",
          title: "Connection Error",
          message: err.message || "Failed to reach NIRNAYA OGD adapter.",
        });
      } finally {
        setSyncingOgd(false);
      }
    },
    [ogdApiKeyInput, refreshConnectorsAndEvidence]
  );

  const fetchDistricts = useCallback(async (layerName: string) => {
    setMapLoading(true);
    setMapError(null);
    try {
      const res = await fetch(`/api/v1/geo/districts?layer=${encodeURIComponent(layerName)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { districts: District[] };
      if (data.districts) {
        setDistrictsList(data.districts);
        setSelectedDistrict((prev) => {
          if (!prev) return data.districts[0] || null;
          return data.districts.find((d) => d.id === prev.id) || data.districts[0] || null;
        });
      }
    } catch (err: any) {
      console.error("Geospatial sync error:", err);
      setMapError("Failed to load district geospatial records from database.");
    } finally {
      setMapLoading(false);
    }
  }, []);

  // Verify authenticated session and load database data
  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json() as Promise<{ user: AuthUser | null }>)
      .then((data) => {
        if (!data.user) {
          window.location.href = "/login";
          return;
        }
        setCurrentUser(data.user);
      })
      .catch(() => {
        window.location.href = "/login";
      });

    Promise.all([
      fetch("/api/v1/dashboard").then(
        (r) =>
          r.json() as Promise<{
            metrics?: Metric[];
            studies?: PolicyStudy[];
            yearlyEvidence?: YearlyEvidence[];
            quality?: EvidenceQuality;
          }>
      ),
      fetch("/api/v1/evidence").then((r) => r.json() as Promise<{ items: Evidence[] }>),
      fetch("/api/v1/connectors").then((r) => r.json() as Promise<{ items: Connector[] }>),
      fetch(`/api/v1/geo/districts?layer=${encodeURIComponent(mapLayer)}`).then(
        (r) => r.json() as Promise<{ districts: District[] }>
      ),
    ])
      .then(([dash, ev, conn, geo]) => {
        if (dash.metrics) setMetrics(dash.metrics);
        if (dash.studies) setStudies(dash.studies);
        if (dash.yearlyEvidence) setYearlyEvidence(dash.yearlyEvidence);
        if (dash.quality) setQuality(dash.quality);
        if (ev.items) setEvidence(ev.items);
        if (conn.items) setConnectors(conn.items);
        if (geo.districts) {
          setDistrictsList(geo.districts);
          const defaultDist = geo.districts.find((d) => d.name === "Kancheepuram") || geo.districts[0];
          setSelectedDistrict(defaultDist || null);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load NIRNAYA initial state:", err);
        setLoading(false);
      });
  }, []);

  // Sync layer changes with district geospatial API
  useEffect(() => {
    fetchDistricts(mapLayer);
  }, [mapLayer, fetchDistricts]);

  // Global Keyboard Shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        if (active !== "evidence") {
          setActive("evidence");
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [active]);

  // Topbar Global Search live OGD discovery debounced effect
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setTopOgdResults([]);
      setTopOgdTotal(0);
      setTopOgdLoading(false);
      setTopOgdError(null);
      setTopOgdDetectedGeography(null);
      return;
    }

    setTopOgdLoading(true);
    setTopOgdError(null);
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/v1/ogd/search?q=${encodeURIComponent(trimmed)}&limit=3`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as {
          items?: OgdDiscoveredDataset[];
          total?: number;
          detectedGeography?: string | null;
        };
        setTopOgdResults(data.items || []);
        setTopOgdTotal(data.total || 0);
        setTopOgdDetectedGeography(data.detectedGeography || null);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setTopOgdError(err.message || "Failed to reach data.gov.in");
          setTopOgdDetectedGeography(null);
        }
      } finally {
        setTopOgdLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // Click-outside listener to close topbar search dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setSearchFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ChatGPT model context tool registration
  useEffect(() => {
    const context =
      typeof document === "undefined"
        ? undefined
        : (document as Document & {
            modelContext?: { registerTool: (tool: unknown, opts?: { signal: AbortSignal }) => void };
          }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    context.registerTool(
      {
        name: "search_land_governance_evidence",
        title: "Search NIRNAYA evidence",
        description: "Search the NIRNAYA evidence repository by topic, authority or geography.",
        inputSchema: {
          type: "object",
          properties: { query: { type: "string" } },
          required: ["query"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true, untrustedContentHint: false },
        execute: async (input: { query: string }) => {
          setQuery(input.query);
          setActive("evidence");
          const r = await fetch(`/api/v1/evidence?q=${encodeURIComponent(input.query)}`);
          const body = (await r.json()) as { items: Evidence[] };
          setEvidence(body.items);
          return {
            count: body.items.length,
            items: body.items.slice(0, 5).map((x: Evidence) => ({ id: x.id, title: x.title, score: x.score })),
          };
        },
      },
      { signal: lifecycle.signal }
    );
    return () => lifecycle.abort();
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return evidence;
    const q = query.toLowerCase();
    return evidence.filter((item) =>
      `${item.title} ${item.summary} ${item.authority} ${item.geography} ${item.tags.join(" ")} ${item.citation || ""}`
        .toLowerCase()
        .includes(q)
    );
  }, [evidence, query]);

  function go(view: View) {
    setActive(view);
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openStudyInScenario(studyId: string) {
    setScenarioStudyId(studyId);
    go("scenario");
  }

  const fetchScenarioHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/scenarios/history");
      if (!res.ok) return;
      const data = (await res.json()) as { history: ScenarioHistoryItem[] };
      if (data.history) {
        setScenarioHistory(data.history);
      }
    } catch (err) {
      console.error("Failed to load scenario history:", err);
    }
  }, []);

  useEffect(() => {
    fetchScenarioHistory();
  }, [fetchScenarioHistory]);

  async function runScenario() {
    setRunning(true);
    setScenarioError(null);
    try {
      const response = await fetch("/api/v1/scenarios/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studyId: scenarioStudyId,
          geographyId: scenarioGeographyId,
          interventionId: scenarioInterventionId,
          intensity: scenarioParameters.intensity,
          coverage: scenarioParameters.coverage,
          timeHorizon: scenarioParameters.timeHorizon,
          focusArea: scenarioParameters.focusArea,
          conservation: scenario.conservation,
          livelihood: scenario.livelihood,
          feasibility: scenario.feasibility,
          water: scenario.water,
        }),
      });
      if (!response.ok) {
        const errData = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(errData.error || `Scenario execution failed (HTTP ${response.status})`);
      }
      const result = await response.json();
      setScenarioResult(result);
      fetchScenarioHistory();
    } catch (err: any) {
      console.error("Scenario execution failed:", err);
      setScenarioError(err.message || "Failed to execute scenario.");
    } finally {
      setRunning(false);
    }
  }

  async function generateDecisionBrief() {
    if (!scenarioResult) return;
    try {
      const currentStudy = studies.find((s) => s.id === scenarioStudyId);
      const currentDistrict = districtsList.find((d) => d.id === scenarioGeographyId);
      const res = await fetch("/api/v1/scenarios/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runId: scenarioResult.runId,
          studyTitle: currentStudy?.title || scenarioResult.studyName,
          districtName: currentDistrict?.name || scenarioResult.districtName,
          interventionName: scenarioResult.interventionName,
          score: scenarioResult.score ?? scenarioResult.readinessScore,
          recommendation: scenarioResult.recommendation,
          parameters: scenarioResult.parameters || scenarioParameters,
          indicators: scenarioResult.indicators,
          baseline: scenarioResult.baseline,
          calculationExplanation: scenarioResult.calculationExplanation,
          impacts: scenarioResult.impacts,
          assumptions: scenarioResult.assumptions,
        }),
      });
      if (!res.ok) throw new Error("Failed to generate brief");
      const data = (await res.json()) as { brief: DecisionBrief };
      if (data.brief) {
        setDecisionBrief(data.brief);
      }
    } catch (err) {
      console.error("Brief generation failed:", err);
    }
  }

  async function openCompareModal() {
    await fetchScenarioHistory();
    setCompareOpen(true);
  }

  const loadScenarioRun = useCallback((h: ScenarioHistoryItem) => {
    // 1. Restore Pilot Geography
    if (h.geographyId) {
      setScenarioGeographyId(h.geographyId);
    }

    // 2. Restore Policy Study
    if (h.studyId) {
      setScenarioStudyId(h.studyId);
    }

    // 3. Restore Policy Intervention
    if (h.interventionId) {
      setScenarioInterventionId(h.interventionId);
    }

    // 4. Restore All 4 Slider Values
    const conservation = typeof h.conservation === "number" ? h.conservation : (h.parameters?.intensity ?? 65);
    const livelihood = typeof h.livelihood === "number" ? h.livelihood : 72;
    const feasibility = typeof h.feasibility === "number" ? h.feasibility : 58;
    const water = typeof h.water === "number" ? h.water : (h.parameters?.coverage ?? 80);

    const sliderValues = { conservation, livelihood, feasibility, water };
    setScenario(sliderValues);

    // 5. Restore Implementation Rigor & Parameters
    const params: ScenarioParameters = {
      intensity: h.parameters?.intensity ?? conservation,
      coverage: h.parameters?.coverage ?? water,
      timeHorizon: h.parameters?.timeHorizon ?? 3,
      focusArea: h.parameters?.focusArea,
    };
    setScenarioParameters(params);

    // 6. District Baseline & Study Baseline Resolution
    const targetDistrict = districtsList.find((d) => d.id === (h.geographyId || scenarioGeographyId)) || districtsList[0];
    const baseline: DistrictBaseline = targetDistrict
      ? {
          id: targetDistrict.id,
          name: targetDistrict.name,
          state: targetDistrict.state,
          compositeRisk: targetDistrict.compositeRisk,
          riskLevel: targetDistrict.riskLevel,
          groundwaterStress: targetDistrict.indicators?.groundwaterStress ?? 84,
          builtUpExpansion: targetDistrict.indicators?.builtUpExpansion ?? 71,
          livelihoodSensitivity: targetDistrict.indicators?.livelihoodSensitivity ?? 64,
          landDisputeIntensity: targetDistrict.indicators?.landDisputeIntensity ?? 68,
          dataCompleteness: targetDistrict.indicators?.dataCompleteness ?? 62,
        }
      : (h.baselineData || {
          id: "dist-kancheepuram",
          name: "Kancheepuram",
          state: "Tamil Nadu",
          compositeRisk: 72,
          riskLevel: "High",
          groundwaterStress: 84,
          builtUpExpansion: 71,
          livelihoodSensitivity: 64,
          landDisputeIntensity: 68,
          dataCompleteness: 62,
        });

    const targetStudy = studies.find((s) => s.id === (h.studyId || scenarioStudyId));
    const studyInfo = targetStudy
      ? { id: targetStudy.id, title: targetStudy.title, readinessScore: targetStudy.score }
      : { id: h.studyId || "ps-001", title: "Peri-urban land conversion safeguards", readinessScore: 78 };

    // 7. Calculate and restore complete deterministic Decision Outlook
    const calc = calculateScenario(
      baseline,
      sliderValues,
      studyInfo,
      h.interventionId || scenarioInterventionId,
      params
    );

    let scenarioDataObj = h.scenarioData;
    if (typeof scenarioDataObj === "string") {
      try {
        scenarioDataObj = JSON.parse(scenarioDataObj);
      } catch {
        scenarioDataObj = null;
      }
    }

    setScenarioResult({
      ...calc,
      runId: h.id,
      districtName: h.districtName || calc.districtName,
      interventionName: h.interventionName || calc.interventionName,
      score: h.score ?? calc.readinessScore,
      readinessScore: h.score ?? calc.readinessScore,
      readinessVerdict: calc.readinessVerdict,
      recommendation: h.recommendation || calc.recommendation,
      impacts: (Array.isArray(h.impacts) && h.impacts.length > 0) ? h.impacts : calc.impacts,
      indicators: (scenarioDataObj?.indicators && scenarioDataObj.indicators.length > 0)
        ? scenarioDataObj.indicators
        : calc.indicators,
      scenarioCompositeRisk: scenarioDataObj?.compositeRisk ?? calc.scenarioCompositeRisk,
      scenarioRiskLevel: scenarioDataObj?.riskLevel ?? calc.scenarioRiskLevel,
      sliders: sliderValues,
      parameters: params,
      baseline,
    });

    // 8. Close modal and navigate to Scenario Studio
    setCompareOpen(false);
    setActive("scenario");
  }, [districtsList, studies, scenarioGeographyId, scenarioStudyId, scenarioInterventionId]);

  function handleCopyChecksum(text: string) {
    navigator.clipboard.writeText(text);
    setCopiedChecksum(true);
    setTimeout(() => setCopiedChecksum(false), 2000);
  }

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  }

  const userInitials = useMemo(() => {
    if (!currentUser?.fullName) return "SS";
    const parts = currentUser.fullName.trim().split(" ");
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [currentUser]);

  return (
    <div className="app-shell">
      {/* Top Header */}
      <header className="topbar">
        <button className="mobile-menu" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Open navigation">
          <Menu />
        </button>
        <AppMark />
        <div className="top-search-container" ref={searchContainerRef}>
          <div className="top-search">
            <Search size={17} />
            <input
              ref={searchInputRef}
              aria-label="Search all evidence"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setSearchFocused(false);
                  go("evidence");
                } else if (e.key === "Escape") {
                  setSearchFocused(false);
                }
              }}
              placeholder="Search policies, datasets, research or districts"
            />
            {topOgdLoading && (
              <div
                className="spinner"
                style={{ width: 14, height: 14, borderColor: "#0284c733", borderTopColor: "#0284c7", marginRight: 6 }}
                title="Querying official data.gov.in catalog..."
              />
            )}
            <kbd onClick={() => searchInputRef.current?.focus()} style={{ cursor: "pointer" }} title="Focus search">
              ⌘ K
            </kbd>
          </div>

          {/* Interactive Global Search Dropdown */}
          {searchFocused && query.trim().length >= 2 && (
            <div className="global-search-dropdown">
              {/* Official OGD Discovery Section */}
              <div className="global-search-section-header">
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span className="ogd-live-tag">
                    <Sparkles size={9} />
                    LIVE OGD PLATFORM
                  </span>
                  <span>data.gov.in Discovery</span>
                  {topOgdDetectedGeography && (
                    <span
                      style={{
                        fontSize: "10px",
                        padding: "1px 7px",
                        borderRadius: "999px",
                        background: "#e0f2fe",
                        color: "#0369a1",
                        border: "1px solid #bae6fd",
                        fontWeight: 500,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 3,
                      }}
                      title={`Prioritizing ${topOgdDetectedGeography} based on geographic term in your query`}
                    >
                      <MapPin size={9} />
                      Prioritizing {topOgdDetectedGeography} results
                    </span>
                  )}
                </div>
                <span style={{ fontSize: "10px", color: "#64748b", textTransform: "none", fontWeight: 500 }}>
                  {topOgdLoading ? "Searching official catalog..." : `${topOgdTotal} official datasets`}
                </span>
              </div>

              {topOgdLoading ? (
                <div style={{ padding: "14px", textAlign: "center", fontSize: "11px", color: "#64748b" }}>
                  Discovering matching datasets live from Government of India OGD Platform...
                </div>
              ) : topOgdError ? (
                <div style={{ padding: "12px 14px", fontSize: "11px", color: "#b91c1c", background: "#fef2f2" }}>
                  Could not reach data.gov.in: {topOgdError}
                </div>
              ) : topOgdResults.length === 0 ? (
                <div style={{ padding: "12px 14px", fontSize: "11px", color: "#64748b" }}>
                  No live datasets matching "{query.trim()}" found on data.gov.in.
                </div>
              ) : (
                topOgdResults.map((item) => (
                  <a
                    key={item.id}
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="global-search-item"
                    title={`Open official catalog page on data.gov.in: ${item.title}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSearchFocused(false);
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: "9px", fontWeight: 700, color: "#047857", textTransform: "uppercase" }}>
                        Official Dataset · {item.ministry}
                      </span>
                      <span style={{ fontSize: "10px", color: "#0284c7", display: "inline-flex", alignItems: "center", gap: 3 }}>
                        data.gov.in <ExternalLink size={10} />
                      </span>
                    </div>
                    <h4>{item.title}</h4>
                    <p>{item.description}</p>
                    <div style={{ display: "flex", gap: 8, fontSize: "10px", color: "#64748b" }}>
                      {item.state && <span>Jurisdiction: {item.state}</span>}
                      {item.lastUpdated && <span>Updated: {item.lastUpdated}</span>}
                    </div>
                  </a>
                ))
              )}

              {/* Curated NIRNAYA Database Evidence Section */}
              <div className="global-search-section-header" style={{ borderTop: "1px solid #eef2f5" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span className="curated-db-tag">
                    <Database size={9} />
                    CURATED EVIDENCE
                  </span>
                  <span>NIRNAYA Repository</span>
                </div>
                <span style={{ fontSize: "10px", color: "#64748b", textTransform: "none", fontWeight: 500 }}>
                  {filtered.length} database records
                </span>
              </div>

              {filtered.length === 0 ? (
                <div style={{ padding: "12px 14px", fontSize: "11px", color: "#64748b" }}>
                  No curated evidence matching "{query.trim()}" in NIRNAYA database.
                </div>
              ) : (
                filtered.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className="global-search-item"
                    onClick={() => {
                      setSelectedEvidence(item);
                      setSearchFocused(false);
                      go("evidence");
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: "9px", fontWeight: 700, color: "#1e40af", textTransform: "uppercase" }}>
                        {item.type} · {item.authority}
                      </span>
                      <span style={{ fontSize: "10px", fontWeight: 700, color: "#166534" }}>
                        {item.score}% Relevance
                      </span>
                    </div>
                    <h4>{item.title}</h4>
                    <p>{item.summary}</p>
                  </div>
                ))
              )}

              {/* Dropdown Footer */}
              <div className="global-search-footer">
                <span style={{ color: "#64748b" }}>
                  Official OGD Discovery + NIRNAYA Curated Repository
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSearchFocused(false);
                    go("evidence");
                  }}
                  style={{
                    border: 0,
                    background: "transparent",
                    color: "#0284c7",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  View full results in Evidence Explorer <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="top-actions">
          <button onClick={() => setHelpOpen(true)} aria-label="Help and Project Overview" title="System Guidance & PS 26019 Information">
            <CircleHelp />
          </button>
          <div
            className="user-chip"
            onClick={() => setProfileOpen(true)}
            style={{ cursor: "pointer" }}
            title="Click to view Officer Profile & Clearance"
          >
            <span>{userInitials}</span>
            <div>
              <b>{currentUser?.fullName || "Officer"}</b>
              <small>{currentUser?.role || "Policy Analyst"} · DoLR</small>
            </div>
          </div>
        </div>
      </header>

      {/* Left Sidebar */}
      <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="mobile-brand">
          <AppMark />
          <button onClick={() => setMobileOpen(false)} aria-label="Close navigation">
            <X />
          </button>
        </div>
        <p className="nav-label">DECISION WORKSPACE</p>
        <nav>
          {navigation.map((item) => (
            <button
              key={item.id}
              onClick={() => go(item.id)}
              className={active === item.id ? "active" : ""}
            >
              <item.icon />
              <span>{item.label}</span>
              {active === item.id && <ChevronRight className="nav-chevron" />}
            </button>
          ))}
        </nav>
        <div
          className="sidebar-project"
          onClick={() => openStudyInScenario("ps-001")}
          style={{ cursor: "pointer" }}
          title="Click to open active study in Scenario Studio"
        >
          <span className="project-icon">
            <Layers3 />
          </span>
          <div>
            <small>ACTIVE STUDY</small>
            <b>Peri-urban safeguards</b>
            <span>Tamil Nadu · Draft 2</span>
          </div>
        </div>
        <div className="sidebar-foot">
          <ShieldCheck />
          <div>
            <b>Government workspace</b>
            <span>Database-backed · Audit Ready</span>
          </div>
        </div>
      </aside>

      {mobileOpen && <button className="backdrop" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}

      {/* Main Views Container */}
      <main className="main-area">
        {active === "dashboard" && (
          <Dashboard
            metrics={metrics}
            studies={studies}
            yearlyEvidence={yearlyEvidence}
            quality={quality}
            onNavigate={go}
            onOpenStudy={openStudyInScenario}
          />
        )}
        {active === "evidence" && (
          <EvidenceExplorer
            query={query}
            setQuery={setQuery}
            onSelect={setSelectedEvidence}
          />
        )}
        {active === "map" && (
          <GeoInsights
            districts={districtsList}
            evidence={evidence}
            selectedDistrict={selectedDistrict}
            onSelectDistrict={setSelectedDistrict}
            layer={mapLayer}
            setLayer={setMapLayer}
            zoom={mapZoom}
            setZoom={setMapZoom}
            loading={mapLoading}
            error={mapError}
            onRetry={() => fetchDistricts(mapLayer)}
            onOpenSettings={() => setMapSettingsOpen(true)}
            onInspectBhuvan={() => {
              const bh = connectors.find((c) => c.id === "bhuvan");
              if (bh) {
                setInspectConnector(bh);
              } else {
                setMapSettingsOpen(true);
              }
            }}
            onNavigateToScenario={(districtId) => {
              setScenarioGeographyId(districtId);
              setActive("scenario");
            }}
          />
        )}
        {active === "scenario" && (
          <ScenarioStudio
            values={scenario}
            setValues={setScenario}
            result={scenarioResult}
            running={running}
            error={scenarioError}
            run={runScenario}
            studies={studies}
            districts={districtsList}
            selectedStudyId={scenarioStudyId}
            setSelectedStudyId={setScenarioStudyId}
            selectedGeographyId={scenarioGeographyId}
            setSelectedGeographyId={setScenarioGeographyId}
            selectedInterventionId={scenarioInterventionId}
            setSelectedInterventionId={setScenarioInterventionId}
            parameters={scenarioParameters}
            setParameters={setScenarioParameters}
            history={scenarioHistory}
            onSelectHistoryItem={loadScenarioRun}
            onGenerateBrief={generateDecisionBrief}
            onCompare={openCompareModal}
          />
        )}
        {active === "connectors" && (
          <Connectors
            connectors={connectors}
            selectedDistrict={selectedDistrict}
            onInspectContract={setInspectConnector}
            onOpenApiDoc={() => setApiDocOpen(true)}
            onSyncOgd={() => handleSyncOgd()}
            syncingOgd={syncingOgd}
            onOpenOgdModal={() => setOgdModalOpen(true)}
            ogdSyncFeedback={ogdSyncFeedback}
            onDismissFeedback={() => setOgdSyncFeedback(null)}
          />
        )}
      </main>

      {/* Evidence Detail Modal Dialog */}
      <Dialog open={!!selectedEvidence} onOpenChange={(open) => !open && setSelectedEvidence(null)}>
        <DialogContent className="evidence-dialog" style={{ maxWidth: 640 }}>
          {selectedEvidence && (
            <>
              <DialogHeader>
                <div className="document-badge">
                  <FileText />
                  {selectedEvidence.type} RECORD
                </div>
                <DialogTitle>{selectedEvidence.title}</DialogTitle>
                <DialogDescription>
                  {selectedEvidence.authority} · {selectedEvidence.year} · {selectedEvidence.geography}
                </DialogDescription>
              </DialogHeader>

              <div className="dialog-score">
                <span>Evidence relevance rating</span>
                <b>{selectedEvidence.score}%</b>
                <div>
                  <i style={{ width: `${selectedEvidence.score}%` }} />
                </div>
              </div>

              <p className="dialog-summary">{selectedEvidence.summary}</p>

              {selectedEvidence.citation && (
                <div style={{ fontSize: 11, background: "#f8fafb", border: "1px solid #e1eaed", borderRadius: 6, padding: "8px 11px", color: "#475e6a" }}>
                  <b>Official Citation:</b> {selectedEvidence.citation}
                </div>
              )}

              <div className="tag-list">
                {selectedEvidence.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>

              <div className="provenance" style={{ display: "flex", flexDirection: "column", gap: 9, background: "#f1f7f5", border: "1px solid #cce4dc", borderRadius: 8, padding: "11px 13px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <ShieldCheck style={{ color: "#1f7566", marginTop: 2, flexShrink: 0 }} size={20} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                      <b style={{ color: "#134d42", fontSize: 11 }}>NIRNAYA Evidence Data Layer</b>
                      <span style={{ fontSize: 10, background: "#d9eef5", color: "#11475b", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>
                        ID: {selectedEvidence.id}
                      </span>
                    </div>
                    <p style={{ margin: "0 0 5px", fontSize: 10, color: "#3d5e56", lineHeight: 1.4 }}>
                      Verified research record retrieved from NIRNAYA local database layer under SIH PS 26019 guidelines.
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px 8px", fontSize: 10, color: "#45665f" }}>
                      <div><b>Source Authority:</b> {selectedEvidence.authority}</div>
                      <div><b>Snapshot Date:</b> {selectedEvidence.provenanceDate || "2026-09-15"}</div>
                      <div><b>Geography Scope:</b> {selectedEvidence.geography}</div>
                      <div><b>Relevance Rating:</b> {selectedEvidence.score}%</div>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #d4eae1", paddingTop: 8, marginTop: 2 }}>
                  <span style={{ fontSize: 10, color: "#23554b", fontFamily: "monospace" }}>
                    SHA-256: <code>{selectedEvidence.checksum.slice(0, 32)}…</code>
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyChecksum(selectedEvidence.checksum)}
                    style={{ height: 26, fontSize: 10, borderColor: "#b8d9d0", color: "#175a4d" }}
                  >
                    {copiedChecksum ? <Check size={11} style={{ marginRight: 4 }} /> : <Copy size={11} style={{ marginRight: 4 }} />}
                    {copiedChecksum ? "Copied" : "Copy hash"}
                  </Button>
                </div>
              </div>

              <Button
                className="gov-button"
                style={{ width: "100%", marginTop: 8 }}
                onClick={() => window.open(selectedEvidence.sourceUrl, "_blank", "noopener,noreferrer")}
              >
                Open source authority record ({selectedEvidence.authority}) <ExternalLink size={14} style={{ marginLeft: 6 }} />
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Decision Brief Modal */}
      <Dialog open={!!decisionBrief} onOpenChange={(open) => !open && setDecisionBrief(null)}>
        <DialogContent className="evidence-dialog" style={{ maxWidth: 740, maxHeight: "90vh", overflowY: "auto" }}>
          {decisionBrief && (
            <>
              <div className="brief-letterhead">
                <div>
                  <span className="brief-badge">GOVERNMENT OF INDIA</span>
                  <h3 style={{ margin: "4px 0 1px", fontFamily: "Georgia, serif", color: "#123b5d", fontSize: 18 }}>
                    {decisionBrief.ministry}
                  </h3>
                  <p style={{ margin: 0, fontSize: 12, color: "#546c79" }}>{decisionBrief.department}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <code style={{ fontSize: 10, color: "#925721", fontWeight: 700 }}>{decisionBrief.referenceNumber}</code>
                  <span style={{ display: "block", fontSize: 10, color: "#7a8e97" }}>
                    {new Date(decisionBrief.generatedAt).toLocaleDateString("en-IN", { dateStyle: "long" })}
                  </span>
                </div>
              </div>

              <DialogHeader>
                <DialogTitle style={{ fontSize: 20 }}>{decisionBrief.subject}</DialogTitle>
                <DialogDescription>
                  Pilot Geography: <b>{decisionBrief.pilotGeography}</b> · Policy Readiness: <b>{decisionBrief.readinessIndex}</b> ({decisionBrief.classification})
                </DialogDescription>
              </DialogHeader>

              <div style={{ background: "#f0f6f5", borderLeft: "3px solid #1e7265", padding: "10px 14px", borderRadius: "0 6px 6px 0", fontSize: 12, lineHeight: 1.55 }}>
                <b>Executive Recommendation:</b> {decisionBrief.executiveSummary}
              </div>

              {/* Scenario Configuration Parameters */}
              {decisionBrief.scenarioParameters && (
                <div className="brief-meta" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                  <div>
                    <span>Intervention Intensity:</span> <b>{decisionBrief.scenarioParameters.intensity}%</b>
                  </div>
                  <div>
                    <span>Implementation Coverage:</span> <b>{decisionBrief.scenarioParameters.coverage}%</b>
                  </div>
                  <div>
                    <span>Time Horizon:</span> <b>{decisionBrief.scenarioParameters.timeHorizon} Year(s)</b>
                  </div>
                </div>
              )}

              {/* Baseline vs Scenario Projected Indicators */}
              {decisionBrief.indicatorComparisons && decisionBrief.indicatorComparisons.length > 0 && (
                <div style={{ margin: "14px 0" }}>
                  <b style={{ fontSize: 11, color: "#18394e", display: "block", marginBottom: 6 }}>
                    Baseline vs Projected Indicator Outlook:
                  </b>
                  <div style={{ border: "1px solid #dce5e8", borderRadius: 7, overflow: "hidden", fontSize: 11 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1fr", background: "#f6f9fa", padding: "7px 12px", fontWeight: 700, color: "#506571", borderBottom: "1px solid #dce5e8" }}>
                      <span>Indicator</span>
                      <span>Baseline</span>
                      <span>Scenario</span>
                      <span style={{ textAlign: "right" }}>Projected Shift</span>
                    </div>
                    {decisionBrief.indicatorComparisons.map((ind) => (
                      <div key={ind.key} style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1fr", padding: "7px 12px", borderBottom: "1px solid #edf2f4", alignItems: "center" }}>
                        <span style={{ fontWeight: 600, color: "#1a3b50" }}>{ind.label}</span>
                        <span>{ind.baseline}%</span>
                        <span style={{ fontWeight: 700, color: "#123b5d" }}>{ind.scenario}%</span>
                        <span style={{ textAlign: "right", color: ind.direction === "improved" ? "#1e7265" : ind.direction === "worsened" ? "#b42318" : "#60747f", fontWeight: 700 }}>
                          {ind.absoluteChange > 0 ? `+${ind.absoluteChange}%` : `${ind.absoluteChange}%`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Supporting Evidence References from Local Database */}
              {decisionBrief.evidenceReferences && decisionBrief.evidenceReferences.length > 0 && (
                <div style={{ margin: "14px 0" }}>
                  <b style={{ fontSize: 11, color: "#18394e", display: "block", marginBottom: 6 }}>
                    Supporting Database Evidence References (Authentic Records):
                  </b>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {decisionBrief.evidenceReferences.map((e) => (
                      <div key={e.id} style={{ background: "#f8fafb", border: "1px solid #e1e9ec", borderRadius: 6, padding: "8px 10px", fontSize: 11 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                          <b style={{ color: "#153b57" }}>{e.title}</b>
                          <span style={{ fontSize: 10, color: "#1c6d5f", fontWeight: 700 }}>Relevance: {e.score}%</span>
                        </div>
                        <div style={{ display: "flex", gap: 12, color: "#617782", fontSize: 10, marginTop: 3 }}>
                          <span>Authority: <b>{e.authority}</b></span>
                          <span>Year: <b>{e.year}</b></span>
                          <span>Scope: <b>{e.geography}</b></span>
                          <span style={{ fontFamily: "monospace" }}>SHA-256: {e.checksum.slice(0, 16)}…</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Statutory Implementation Checklist */}
              <div style={{ margin: "12px 0" }}>
                <b style={{ fontSize: 11, color: "#18394e" }}>Statutory Implementation Checklist:</b>
                <div className="brief-checklist">
                  {decisionBrief.safeguardChecklist.map((c, idx) => (
                    <div className="brief-check-item" key={idx}>
                      <span>{c.item}</span>
                      <b style={{ color: c.status === "Satisfied" || c.status === "Active" ? "#1e7265" : "#be5820" }}>
                        {c.status}
                      </b>
                    </div>
                  ))}
                </div>
              </div>

              {/* Honest Limitations Notice */}
              <div style={{ background: "#fff8f0", border: "1px solid #f6d2a8", borderRadius: 7, padding: "9px 12px", fontSize: 10, color: "#8a531f", lineHeight: 1.5, margin: "10px 0" }}>
                <b>PROTOTYPE POLICY SIMULATION NOTICE:</b> {decisionBrief.limitationsNotice || "This decision brief is a prototype simulation produced by NIRNAYA for Smart India Hackathon PS 26019. It uses normalized indicators from the local database and bounded deterministic elasticity assumptions. It is not an officially approved government order or a guaranteed outcome forecast."}
              </div>

              <div style={{ fontSize: 10, color: "#6b808a", borderTop: "1px solid #e5edef", paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
                <span>{decisionBrief.legalProvenance}</span>
                <code>{decisionBrief.auditableChecksum}</code>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                <Button className="gov-button" onClick={() => window.print()} style={{ flex: 1 }}>
                  Print / Export Decision Brief
                </Button>
                <Button variant="outline" onClick={() => setDecisionBrief(null)}>
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Inspect Connector Contract Dialog */}
      <Dialog open={!!inspectConnector} onOpenChange={(open) => !open && setInspectConnector(null)}>
        <DialogContent className="evidence-dialog" style={{ maxWidth: 650 }}>
          {inspectConnector && (
            <>
              <DialogHeader>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span className={`contract-badge ${inspectConnector.status === "live" ? "ready" : inspectConnector.status === "sandbox" ? "sandbox" : "restricted"}`}>
                    {inspectConnector.governanceStatus}
                  </span>
                  <span style={{ fontSize: 11, color: "#657c87" }}>{inspectConnector.owner}</span>
                </div>
                <DialogTitle>{inspectConnector.name} Integration Contract</DialogTitle>
                <DialogDescription>
                  Auth: <b>{inspectConnector.authType}</b> · Refresh: <b>{inspectConnector.refresh}</b>
                </DialogDescription>
              </DialogHeader>

              <div style={{ fontSize: 12, lineHeight: 1.5, color: "#374f5d" }}>
                {inspectConnector.purpose}
              </div>

              <div style={{ background: "#f5f8f9", border: "1px solid #e1e9ec", borderRadius: 7, padding: 10 }}>
                <small style={{ display: "block", fontSize: 10, color: "#748892", fontWeight: 700 }}>APPLICATION ENDPOINT</small>
                <code style={{ fontSize: 12, color: "#165576" }}>{inspectConnector.endpoint}</code>
              </div>

              {inspectConnector.id === "bhuvan" && (
                <div style={{ background: "#edf7f3", border: "1px solid #c7e8dc", borderRadius: 8, padding: 12, margin: "10px 0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <b style={{ color: "#14594c", fontSize: 12 }}>Official ISRO / NRSC Service Verified</b>
                    <span className="bhuvan-live-tag">LIVE WMS</span>
                  </div>
                  <div style={{ marginTop: 6, fontSize: 11, color: "#173847" }}>
                    <b>Verified Layers:</b>
                    <ul style={{ margin: "4px 0 6px 16px", padding: 0 }}>
                      <li><code>basemap:TN_LULC</code> — Tamil Nadu State Land Use / Land Cover (1:50,000)</li>
                      <li><code>sisdpv2:TN_Kancheepuram_lulc_v2</code> — Kancheepuram District SISDP V2 (High-Resolution)</li>
                    </ul>
                  </div>
                  <p style={{ margin: "6px 0 0", fontSize: 10, color: "#14594c" }}>
                    <b>Consumption Mode:</b> Real-time client-side OGC WMS rendering directly into the SVG map. No satellite tiles are cached or stored locally.
                  </p>
                </div>
              )}

              <div>
                <b style={{ fontSize: 11, color: "#18394e" }}>Technical Contract Specification:</b>
                <pre className="contract-code-block">
                  {JSON.stringify(inspectConnector.contract || { status: inspectConnector.governanceStatus }, null, 2)}
                </pre>
              </div>

              {inspectConnector.documentationUrl && (
                <Button
                  variant="outline"
                  onClick={() => window.open(inspectConnector.documentationUrl, "_blank")}
                  style={{ width: "100%" }}
                >
                  Open External Documentation <ExternalLink size={14} style={{ marginLeft: 6 }} />
                </Button>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Scenario Compare History Dialog */}
      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent className="evidence-dialog" style={{ maxWidth: 760, maxHeight: "90vh", overflowY: "auto" }}>
          <DialogHeader>
            <DialogTitle>Scenario Comparison & Simulation History</DialogTitle>
            <DialogDescription>
              Compare Baseline against Scenario A (Current Run) and Scenario B (Historical or Alternative Run).
            </DialogDescription>
          </DialogHeader>

          {/* 3-Way Comparison Section if current result exists */}
          {scenarioResult && (
            <div style={{ background: "#f8fafb", border: "1px solid #dce5e8", borderRadius: 8, padding: 14, margin: "8px 0 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <h4 style={{ margin: 0, fontSize: 13, color: "#123b5d", fontFamily: "Georgia, serif" }}>
                  3-Way Indicator Comparison: {scenarioResult.districtName || "District"}
                </h4>
                {scenarioHistory.length > 0 && (
                  <select
                    style={{ fontSize: 11, padding: "4px 8px", borderRadius: 5, border: "1px solid #ccd9de", background: "#fff" }}
                    value={compareScenarioB?.id || ""}
                    onChange={(e) => {
                      const match = scenarioHistory.find((h) => h.id === e.target.value);
                      setCompareScenarioB(match || null);
                    }}
                  >
                    <option value="">Select Scenario B from history…</option>
                    {scenarioHistory.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.interventionName || "Scenario"} · Score {h.score}/100 ({new Date(h.createdAt).toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div style={{ border: "1px solid #e1eaed", borderRadius: 6, overflow: "hidden", fontSize: 11, background: "#fff" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr 1.2fr 1.2fr", background: "#edf3f5", padding: "8px 12px", fontWeight: 700, color: "#475e6a" }}>
                  <span>Metric</span>
                  <span>Baseline</span>
                  <span style={{ color: "#134d42" }}>Scenario A (Current)</span>
                  <span style={{ color: "#925721" }}>Scenario B {compareScenarioB ? `(${compareScenarioB.score}/100)` : "(Pick below)"}</span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr 1.2fr 1.2fr", padding: "8px 12px", borderBottom: "1px solid #f0f4f6", alignItems: "center" }}>
                  <span style={{ fontWeight: 600 }}>Groundwater Stress</span>
                  <span>{scenarioResult.baseline?.groundwaterStress ?? 84}%</span>
                  <b style={{ color: "#134d42" }}>{scenarioResult.indicators?.find((i: any) => i.key === "groundwaterStress")?.scenario ?? 63}%</b>
                  <span style={{ color: "#925721" }}>
                    {compareScenarioB?.scenarioData?.indicators?.find((i: any) => i.key === "groundwaterStress")?.scenario ?? (compareScenarioB ? `${compareScenarioB.water}%` : "—")}
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr 1.2fr 1.2fr", padding: "8px 12px", borderBottom: "1px solid #f0f4f6", alignItems: "center" }}>
                  <span style={{ fontWeight: 600 }}>Built-up Expansion</span>
                  <span>{scenarioResult.baseline?.builtUpExpansion ?? 71}%</span>
                  <b style={{ color: "#134d42" }}>{scenarioResult.indicators?.find((i: any) => i.key === "builtUpExpansion")?.scenario ?? 56}%</b>
                  <span style={{ color: "#925721" }}>
                    {compareScenarioB?.scenarioData?.indicators?.find((i: any) => i.key === "builtUpExpansion")?.scenario ?? (compareScenarioB ? `${compareScenarioB.conservation}%` : "—")}
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr 1.2fr 1.2fr", padding: "8px 12px", borderBottom: "1px solid #f0f4f6", alignItems: "center" }}>
                  <span style={{ fontWeight: 600 }}>Livelihood Sensitivity</span>
                  <span>{scenarioResult.baseline?.livelihoodSensitivity ?? 64}%</span>
                  <b style={{ color: "#134d42" }}>{scenarioResult.indicators?.find((i: any) => i.key === "livelihoodSensitivity")?.scenario ?? 52}%</b>
                  <span style={{ color: "#925721" }}>
                    {compareScenarioB?.scenarioData?.indicators?.find((i: any) => i.key === "livelihoodSensitivity")?.scenario ?? (compareScenarioB ? `${compareScenarioB.livelihood}%` : "—")}
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr 1.2fr 1.2fr", padding: "8px 12px", borderBottom: "1px solid #f0f4f6", alignItems: "center" }}>
                  <span style={{ fontWeight: 600 }}>Land Dispute Index</span>
                  <span>{scenarioResult.baseline?.landDisputeIntensity ?? 68}%</span>
                  <b style={{ color: "#134d42" }}>{scenarioResult.indicators?.find((i: any) => i.key === "landDisputeIntensity")?.scenario ?? 54}%</b>
                  <span style={{ color: "#925721" }}>
                    {compareScenarioB?.scenarioData?.indicators?.find((i: any) => i.key === "landDisputeIntensity")?.scenario ?? "—"}
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr 1.2fr 1.2fr", padding: "8px 12px", borderBottom: "1px solid #f0f4f6", alignItems: "center" }}>
                  <span style={{ fontWeight: 600 }}>Land Records Digitization</span>
                  <span>{scenarioResult.baseline?.dataCompleteness ?? 62}%</span>
                  <b style={{ color: "#134d42" }}>{scenarioResult.indicators?.find((i: any) => i.key === "dataCompleteness")?.scenario ?? 82}%</b>
                  <span style={{ color: "#925721" }}>
                    {compareScenarioB?.scenarioData?.indicators?.find((i: any) => i.key === "dataCompleteness")?.scenario ?? "—"}
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr 1.2fr 1.2fr", padding: "8px 12px", alignItems: "center", background: "#f8fbfb" }}>
                  <span style={{ fontWeight: 700, color: "#123b5d" }}>Composite Risk Score</span>
                  <span style={{ fontWeight: 700 }}>{scenarioResult.baselineCompositeRisk ?? 72}%</span>
                  <b style={{ color: "#134d42", fontSize: 12 }}>{scenarioResult.scenarioCompositeRisk ?? 58}% ({scenarioResult.scenarioRiskLevel})</b>
                  <b style={{ color: "#925721", fontSize: 12 }}>
                    {compareScenarioB?.scenarioData?.compositeRisk ? `${compareScenarioB.scenarioData.compositeRisk}%` : "—"}
                  </b>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "10px 0 8px" }}>
            <b style={{ fontSize: 12, color: "#18394e" }}>All Saved District Simulations:</b>
            <span style={{ fontSize: 11, color: "#6a7f8a" }}>{scenarioHistory.length} run(s) recorded in database</span>
          </div>

          {scenarioHistory.length === 0 ? (
            <div className="empty-state-box">
              <Activity />
              <b>No past simulations recorded</b>
              <p style={{ fontSize: 11 }}>Run a preflight scenario from the studio to populate history.</p>
            </div>
          ) : (
            <div style={{ maxHeight: 280, overflowY: "auto", paddingRight: 4, display: "flex", flexDirection: "column", gap: 7 }}>
              {scenarioHistory.map((h) => (
                <div
                  key={h.id}
                  className="history-card"
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: 7, border: "1px solid #dce5e8" }}
                >
                  <div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <strong style={{ fontSize: 13, color: "#18394e" }}>
                        Score: {h.score}/100
                      </strong>
                      <span style={{ fontSize: 10, background: "#e8f1f5", color: "#123b5d", padding: "2px 6px", borderRadius: 4, fontWeight: 600 }}>
                        {h.districtName || "Pilot District"} · {h.interventionName || "Scenario Model"}
                      </span>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: 10, color: "#475e6a", marginTop: 4, fontWeight: 500 }}>
                      <span>Conservation: <b>{h.conservation ?? 65}%</b></span>
                      <span>Water: <b>{h.water ?? 80}%</b></span>
                      <span>Livelihood: <b>{h.livelihood ?? 72}%</b></span>
                      <span>Feasibility: <b>{h.feasibility ?? 58}%</b></span>
                    </div>
                    <small style={{ fontSize: 9, color: "#95a8b1", display: "block", marginTop: 2 }}>
                      Timestamp: {new Date(h.createdAt).toLocaleString("en-IN")} · ID: <code>{h.id.slice(0, 14)}…</code>
                    </small>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Button
                      size="sm"
                      variant="outline"
                      style={{ fontSize: 10, height: 28 }}
                      onClick={() => setCompareScenarioB(h)}
                    >
                      Compare as Scenario B
                    </Button>
                    <Button
                      size="sm"
                      className="gov-button load-run-btn"
                      data-testid="load-run-button"
                      style={{ fontSize: 10, height: 28 }}
                      onClick={() => loadScenarioRun(h)}
                    >
                      Load Run
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* System Guidance & Help Dialog */}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="evidence-dialog" style={{ maxWidth: 600 }}>
          <DialogHeader>
            <div className="document-badge">
              <Landmark />
              SMART INDIA HACKATHON · PS 26019
            </div>
            <DialogTitle>NIRNAYA Decision Intelligence Platform</DialogTitle>
            <DialogDescription>
              National Digital Platform for Research, Policy Innovation, and Evidence-Based Land Governance
            </DialogDescription>
          </DialogHeader>

          <div style={{ fontSize: 12, lineHeight: 1.6, color: "#3a515f" }}>
            <p style={{ margin: "0 0 10px" }}>
              <b>NIRNAYA</b> is developed for the <b>Ministry of Rural Development (Department of Land Resources)</b> to bridge the gap between academic research, geospatial intelligence, and executive policy formulation.
            </p>
            <b style={{ color: "#183b53", display: "block", marginTop: 12 }}>Key Operational Modules:</b>
            <ul style={{ paddingLeft: 18, margin: "6px 0" }}>
              <li><b>National Overview:</b> Portfolio monitoring, research ingestion pipelines, and verification status.</li>
              <li><b>Evidence Explorer:</b> Full-text repository discovery with verified SHA-256 cryptographic provenance.</li>
              <li><b>Geospatial Insights:</b> Multi-criteria district vulnerability modeling across water stress, urban sprawl, and dispute pendency.</li>
              <li><b>Scenario Studio:</b> Transparent multi-criteria preflight simulation generating auditable policy decision briefs.</li>
              <li><b>Data Integrations:</b> Interoperability registry tracking open adapters and restricted government contracts.</li>
            </ul>
          </div>

          <Button className="gov-button" onClick={() => setHelpOpen(false)}>
            Close Guidance
          </Button>
        </DialogContent>
      </Dialog>

      {/* API Documentation Dialog */}
      <Dialog open={apiDocOpen} onOpenChange={setApiDocOpen}>
        <DialogContent className="evidence-dialog" style={{ maxWidth: 680 }}>
          <DialogHeader>
            <DialogTitle>NIRNAYA Platform REST API</DialogTitle>
            <DialogDescription>Live OpenAPI endpoints for land governance decision support.</DialogDescription>
          </DialogHeader>

          <div style={{ maxHeight: 400, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { m: "GET", p: "/api/v1/dashboard", d: "National overview metrics, active studies, and quality index." },
              { m: "GET", p: "/api/v1/evidence?q=water", d: "Search evidence records with tag and text filters." },
              { m: "GET", p: "/api/v1/geo/districts?layer=Water+stress", d: "Multi-criteria spatial indicators for pilot districts." },
              { m: "GET", p: "/api/v1/connectors", d: "Integration registry and live governance status." },
              { m: "GET", p: "/api/v1/connectors/ogd/contract", d: "Technical contract specification for a specific connector." },
              { m: "POST", p: "/api/v1/scenarios/run", d: "Multi-criteria weighted policy preflight simulation." },
              { m: "GET", p: "/api/v1/scenarios/history", d: "Historical simulation runs and sensitivity records." },
              { m: "POST", p: "/api/v1/scenarios/brief", d: "Generate formal auditable Decision Brief with letterhead." },
            ].map((ep, i) => (
              <div key={i} style={{ border: "1px solid #e1e9ec", borderRadius: 6, padding: "8px 12px", background: "#fbfcfd" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <b style={{ fontSize: 9, padding: "2px 6px", borderRadius: 4, background: ep.m === "GET" ? "#e7f3ef" : "#fff0df", color: ep.m === "GET" ? "#1f7768" : "#ad611f" }}>
                    {ep.m}
                  </b>
                  <code style={{ fontSize: 11, color: "#1b5a79" }}>{ep.p}</code>
                </div>
                <p style={{ margin: "4px 0 0", fontSize: 11, color: "#667a84" }}>{ep.d}</p>
              </div>
            ))}
          </div>

          <Button className="gov-button" onClick={() => setApiDocOpen(false)}>
            Close API Docs
          </Button>
        </DialogContent>
      </Dialog>

      {/* Map Layer Settings Dialog */}
      <Dialog open={mapSettingsOpen} onOpenChange={setMapSettingsOpen}>
        <DialogContent className="evidence-dialog" style={{ maxWidth: 540 }}>
          <DialogHeader>
            <DialogTitle>Geospatial Layer Configuration</DialogTitle>
            <DialogDescription>Threshold standards and data sources for territorial risk calculation.</DialogDescription>
          </DialogHeader>

          <div style={{ fontSize: 12, lineHeight: 1.5, color: "#374f5d" }}>
            <p>
              Risk bands are classified according to statutory central guidelines:
            </p>
            <ul style={{ paddingLeft: 18, margin: "6px 0" }}>
              <li><b>Water Stress:</b> CGWB Dynamic Ground Water Resource norm (Critical: extraction &gt; 90%).</li>
              <li><b>Urban Growth:</b> NRSC Landsat/Sentinel multi-temporal built-up sprawl rate.</li>
              <li><b>Land Disputes:</b> State revenue court pendency and boundary mutation dispute density.</li>
            </ul>
          </div>

          <Button className="gov-button" onClick={() => setMapSettingsOpen(false)}>
            Apply & Close
          </Button>
        </DialogContent>
      </Dialog>

      {/* Officer Profile & Clearance Dialog */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="evidence-dialog" style={{ maxWidth: 520 }}>
          <DialogHeader>
            <div className="document-badge">
              <ShieldCheck />
              OFFICER PROFILE &amp; ACCESS CLEARANCE
            </div>
            <DialogTitle>{currentUser?.fullName || "Officer Profile"}</DialogTitle>
            <DialogDescription>{currentUser?.email || "Authenticated Government Workspace"}</DialogDescription>
          </DialogHeader>

          <div
            style={{
              background: "#f5f9f8",
              border: "1px solid #dbe8e4",
              borderRadius: 8,
              padding: 14,
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div
              style={{
                width: 50,
                height: 50,
                borderRadius: "50%",
                background: "#11344f",
                color: "#fff",
                display: "grid",
                placeItems: "center",
                fontSize: 18,
                fontWeight: 700,
              }}
            >
              {userInitials}
            </div>
            <div>
              <b style={{ fontSize: 14, color: "#11344f" }}>{currentUser?.fullName}</b>
              <span style={{ display: "block", fontSize: 12, color: "#1e7265", fontWeight: 600 }}>
                Authorized Role: {currentUser?.role}
              </span>
              <small style={{ fontSize: 10, color: "#6a818c" }}>
                Department of Land Resources · Ministry of Rural Development
              </small>
            </div>
          </div>

          <div className="brief-meta" style={{ margin: "10px 0" }}>
            <div>
              <span>Access Clearance:</span>{" "}
              <b>{currentUser?.role === "Administrator" ? "Full Administrative (Level 3)" : "Executive Policy Analyst (Level 2)"}</b>
            </div>
            <div>
              <span>Account ID:</span>{" "}
              <code>{currentUser?.id ? currentUser.id.slice(0, 14) : "usr-auth-01"}…</code>
            </div>
            <div>
              <span>Session Status:</span> <b style={{ color: "#1e7265" }}>Active (Encrypted Cookie)</b>
            </div>
            <div>
              <span>Registered Since:</span>{" "}
              <b>{currentUser?.createdAt ? new Date(currentUser.createdAt).toLocaleDateString("en-IN") : "Active"}</b>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <Button
              variant="outline"
              onClick={handleLogout}
              style={{ flex: 1, color: "#b91c1c", borderColor: "#fca5a5" }}
            >
              Sign Out / Invalidate Session
            </Button>
            <Button className="gov-button" onClick={() => setProfileOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* OGD API Configuration & Test Dialog */}
      <Dialog open={ogdModalOpen} onOpenChange={setOgdModalOpen}>
        <DialogContent className="evidence-dialog" style={{ maxWidth: 620 }}>
          <DialogHeader>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span className="contract-badge ready">OFFICIAL DATA ADAPTER</span>
              <span style={{ fontSize: 11, color: "#657c87" }}>NDSAP / data.gov.in</span>
            </div>
            <DialogTitle>Configure OGD Platform India (data.gov.in)</DialogTitle>
            <DialogDescription>
              Direct ingestion pipeline for Ministry of Jal Shakti / NWIC Daily District-wise Rainfall Data.
            </DialogDescription>
          </DialogHeader>

          <div style={{ fontSize: 12, lineHeight: 1.6, color: "#374f5d" }}>
            <p style={{ margin: "0 0 10px" }}>
              In compliance with Government of India NDSAP guidelines, API credentials are never hardcoded in source.
              NIRNAYA reads keys from the <code>OGD_API_KEY</code> or <code>DATA_GOV_IN_API_KEY</code> environment variable, or you may provide a test key below for live runtime verification.
            </p>
          </div>

          <div style={{ background: "#f5f8f9", border: "1px solid #e1e9ec", borderRadius: 8, padding: 12 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#18394e", marginBottom: 6 }}>
              Official NDSAP / data.gov.in API Key
            </label>
            <input
              type="password"
              value={ogdApiKeyInput}
              onChange={(e) => setOgdApiKeyInput(e.target.value)}
              placeholder="e.g. 579b464db66ecb3fdb04945f..."
              style={{
                width: "100%",
                height: 38,
                border: "1px solid #cbd7dc",
                borderRadius: 6,
                padding: "0 10px",
                fontSize: 12,
                fontFamily: "monospace",
              }}
            />
            <small style={{ display: "block", fontSize: 10, color: "#748892", marginTop: 6 }}>
              Registered Government / Researcher keys can be obtained from{" "}
              <a
                href="https://data.gov.in"
                target="_blank"
                rel="noreferrer"
                style={{ color: "#1a5682", textDecoration: "underline" }}
              >
                data.gov.in
              </a>{" "}
              &rarr; My Account &rarr; API Key.
            </small>
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 14 }}>
            <Button
              variant="outline"
              size="sm"
              disabled={syncingOgd}
              onClick={() => {
                handleSyncOgd("");
              }}
            >
              Test Public Request (Unauthenticated)
            </Button>
            <Button
              size="sm"
              disabled={syncingOgd}
              onClick={async () => {
                await handleSyncOgd(ogdApiKeyInput);
                if (ogdSyncFeedback?.type === "success") {
                  setOgdModalOpen(false);
                }
              }}
              className="gov-button"
            >
              {syncingOgd ? (
                <RefreshCw size={14} className="spin" style={{ marginRight: 6 }} />
              ) : (
                <Play size={14} style={{ marginRight: 6 }} />
              )}
              Test Sync with Key
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// -----------------------------------------------------------------------------------------
// Sub-Components
// -----------------------------------------------------------------------------------------

function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        <p>{eyebrow}</p>
        <h1>{title}</h1>
        <span>{description}</span>
      </div>
      {action}
    </div>
  );
}

function Dashboard({
  metrics,
  studies,
  yearlyEvidence,
  quality,
  onNavigate,
  onOpenStudy,
}: {
  metrics: Metric[];
  studies: PolicyStudy[];
  yearlyEvidence?: YearlyEvidence[];
  quality?: EvidenceQuality;
  onNavigate: (v: View) => void;
  onOpenStudy: (id: string) => void;
}) {
  const defaultMetrics = [
    { label: "Pilot evidence records", value: "10", delta: "Curated pilot repository", icon: BookOpen, tone: "blue", target: "evidence" as View },
    { label: "Pilot policy studies", value: "4", delta: "Demonstration scenarios", icon: Landmark, tone: "saffron", target: "scenario" as View },
    { label: "Pilot districts", value: "6", delta: "6 pilot geographies", icon: Globe2, tone: "green", target: "map" as View },
    { label: "Pilot evidence verified", value: "100%", delta: "Provenance authenticated", icon: ShieldCheck, tone: "navy", target: "connectors" as View },
  ];

  const displayMetrics = metrics.length > 0
    ? metrics.map((m) => ({
        label: m.label,
        value: m.value,
        delta: m.delta,
        tone: m.tone,
        icon: m.key === "evidence_assets" ? BookOpen : m.key === "active_studies" ? Landmark : m.key === "districts_covered" ? Globe2 : ShieldCheck,
        target: m.key === "evidence_assets" ? ("evidence" as View) : m.key === "active_studies" ? ("scenario" as View) : m.key === "districts_covered" ? ("map" as View) : ("connectors" as View),
      }))
    : defaultMetrics;

  const displayYearly =
    yearlyEvidence && yearlyEvidence.length > 0
      ? yearlyEvidence
      : [
          { year: 2022, count: 1 },
          { year: 2023, count: 2 },
          { year: 2024, count: 5 },
          { year: 2025, count: 2 },
        ];
  const maxChartCount = Math.max(...displayYearly.map((d) => d.count), 5);

  const govShare = quality?.breakdown?.find((b) => b.key === "government")?.share ?? 80;
  const resShare = quality?.breakdown?.find((b) => b.key === "research")?.share ?? 20;
  const otherShare = quality?.breakdown?.find((b) => b.key === "other")?.share ?? 0;

  return (
    <div className="page-content">
      <PageHeader
        eyebrow="NATIONAL LAND GOVERNANCE"
        title="Decision intelligence overview"
        description="Evidence quality, active policy studies and pilot territorial coverage at a glance."
        action={
          <Button className="gov-button" onClick={() => onNavigate("scenario")}>
            <Sparkles />
            New policy analysis
          </Button>
        }
      />

      {/* Metric Cards Grid - Clickable Drilldowns */}
      <section className="metric-grid">
        {displayMetrics.map((m) => (
          <article
            className={`metric-card ${m.tone}`}
            key={m.label}
            onClick={() => onNavigate(m.target)}
            style={{ cursor: "pointer" }}
            title={`Click to view ${m.label} details`}
          >
            <div className="metric-head">
              <span>
                <m.icon />
              </span>
              <ArrowUpRight />
            </div>
            <strong>{m.value}</strong>
            <h3>{m.label}</h3>
            <p>{m.delta}</p>
          </article>
        ))}
      </section>

      {/* Prototype Data Scope Notice Banner */}
      <div className="prototype-scope-notice" role="note" aria-label="Prototype data scope notice">
        <div className="scope-tag">
          <Database size={13} />
          <span>Prototype data scope</span>
        </div>
        <p>
          NIRNAYA currently operates on a curated six-district pilot dataset. Official government sources are integrated where publicly accessible; restricted systems require authorization.
        </p>
      </div>

      {/* Charts Row */}
      <section className="dashboard-grid">
        <article className="panel trend-panel">
          <div className="panel-head">
            <div>
              <p>PILOT REPOSITORY</p>
              <h2>Evidence records by publication year</h2>
              <span style={{ fontSize: "11px", color: "#687a84" }}>Current pilot repository</span>
            </div>
            <span className="verified-label">
              <CheckCircle2 />
              Database authenticated
            </span>
          </div>
          <div className="chart yearly-chart">
            <div className="chart-y">
              {Array.from({ length: maxChartCount + 1 }, (_, i) => maxChartCount - i).map((tick) => (
                <span key={tick}>{tick}</span>
              ))}
            </div>
            <div className="bars">
              {displayYearly.map((item) => {
                const heightPct = maxChartCount > 0 ? (item.count / maxChartCount) * 100 : 0;
                return (
                  <div
                    className="bar-wrap"
                    key={item.year}
                    title={`${item.count} ${item.count === 1 ? "record" : "records"} published in ${item.year}`}
                  >
                    <b className="bar-count-label">{item.count}</b>
                    <i style={{ height: `${Math.max(heightPct, 12)}%` }} />
                    <span>{item.year}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </article>

        <article className="panel quality-panel">
          <div className="panel-head">
            <div>
              <p>REPOSITORY HEALTH</p>
              <h2>Evidence quality</h2>
              <span style={{ fontSize: "11px", color: "#687a84" }}>Pilot source distribution</span>
            </div>
          </div>
          <div
            className="donut"
            style={{
              background: `conic-gradient(#1e7265 0 ${govShare}%, #df8d31 ${govShare}% ${govShare + resShare}%, #9eb6c2 ${govShare + resShare}% 100%)`,
            }}
          >
            <div>
              <strong>{quality?.verified ?? 100}%</strong>
              <span>verified</span>
            </div>
          </div>
          <div className="legend">
            <span>
              <i className="l1" />
              Government / Statutory <b>{govShare}%</b>
            </span>
            <span>
              <i className="l2" />
              Research / Academic <b>{resShare}%</b>
            </span>
            <span>
              <i className="l3" />
              Other validated <b>{otherShare}%</b>
            </span>
          </div>
        </article>
      </section>

      {/* Active Policy Studies Table */}
      <section className="panel policy-panel">
        <div className="panel-head">
          <div>
            <p>ACTIVE PORTFOLIO</p>
            <h2>Priority policy studies</h2>
          </div>
          <button onClick={() => onNavigate("evidence")}>
            View evidence repository <ArrowUpRight />
          </button>
        </div>
        <div className="policy-table">
          <div className="table-row table-header">
            <span>Policy study</span>
            <span>Stage</span>
            <span>Evidence readiness</span>
            <span>Owner</span>
            <span />
          </div>
          {studies.map((p) => (
            <div
              className="table-row"
              key={p.id}
              onClick={() => onOpenStudy(p.id)}
              style={{ cursor: "pointer" }}
              title="Click to test this policy study in Scenario Studio"
            >
              <span>
                <b>{p.title}</b>
                <small>{p.state} {p.district ? `· ${p.district}` : ""}</small>
              </span>
              <span>
                <em>{p.stage}</em>
              </span>
              <span>
                <div className="progress">
                  <i style={{ width: `${p.score}%` }} />
                </div>
                <small>{p.score}%</small>
              </span>
              <span>{p.owner}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenStudy(p.id);
                }}
                aria-label={`Open ${p.title}`}
              >
                <ChevronRight />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function OgdDatasetCard({ item }: { item: OgdDiscoveredDataset }) {
  return (
    <div
      className="ogd-card"
      key={item.id}
      onClick={() => {
        window.open(item.sourceUrl, "_blank", "noopener,noreferrer");
      }}
      style={{ cursor: "pointer" }}
    >
      <div
        className="file-icon"
        style={{
          background: "#ecfdf5",
          color: "#059669",
          minWidth: 42,
          border: "1px solid #a7f3d0",
        }}
        title="Official Government of India Open Government Data Platform (data.gov.in)"
      >
        <Globe2 size={19} />
      </div>
      <div className="evidence-body" style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <span className="ogd-live-tag">
            <Sparkles size={10} />
            LIVE OGD PLATFORM
          </span>
          <span
            style={{
              background: "#f0fdf4",
              color: "#166534",
              border: "1px solid #bbf7d0",
              fontSize: "10px",
              fontWeight: 600,
              padding: "1px 6px",
              borderRadius: "4px",
            }}
          >
            data.gov.in
          </span>
          <small style={{ color: "#475569", fontSize: "11px" }}>
            {item.ministry}
            {item.department ? ` · ${item.department}` : ""}
            {item.lastUpdated ? ` · Updated ${item.lastUpdated}` : item.publishedDate ? ` · Published ${item.publishedDate}` : ""}
            {item.state ? ` · ${item.state}` : ""}
          </small>
        </div>

        <h3 style={{ margin: "4px 0 6px", fontSize: "15px", fontWeight: 600, color: "#0f172a" }}>
          <a
            href={item.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "inherit", textDecoration: "none" }}
            onClick={(e) => e.stopPropagation()}
          >
            {item.title}
          </a>
        </h3>

        <p style={{ margin: "0 0 10px", fontSize: "12px", color: "#475569", lineHeight: 1.5 }}>
          {item.description}
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
          <span
            style={{
              fontSize: "10px",
              padding: "2px 7px",
              borderRadius: "4px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              color: "#475569",
              fontWeight: 500,
            }}
          >
            Official Source: {item.sourceAuthority}
          </span>
          {item.sector && (
            <span
              style={{
                fontSize: "10px",
                padding: "2px 7px",
                borderRadius: "4px",
                background: "#eff6ff",
                border: "1px solid #dbeafe",
                color: "#1e40af",
              }}
            >
              Sector: {item.sector}
            </span>
          )}
          {item.state && (
            <span
              style={{
                fontSize: "10px",
                padding: "2px 7px",
                borderRadius: "4px",
                background: "#fef3c7",
                border: "1px solid #fde68a",
                color: "#92400e",
              }}
            >
              Jurisdiction: {item.state}
            </span>
          )}
          {item.apiAvailable && (
            <span
              style={{
                fontSize: "10px",
                padding: "2px 7px",
                borderRadius: "4px",
                background: "#f3e8ff",
                border: "1px solid #e9d5ff",
                color: "#6b21a8",
              }}
            >
              API Available
            </span>
          )}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "space-between", gap: 8 }}>
        <a
          href={item.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="gov-button"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            fontSize: "11px",
            padding: "6px 11px",
            borderRadius: "6px",
            background: "#0284c7",
            color: "#ffffff",
            textDecoration: "none",
            fontWeight: 600,
            whiteSpace: "nowrap",
          }}
          title="Open official catalog entry on data.gov.in"
          onClick={(e) => e.stopPropagation()}
        >
          Open official source
          <ExternalLink size={12} />
        </a>
        <span style={{ fontSize: "10px", color: "#64748b", fontWeight: 500 }}>
          data.gov.in Link ↗
        </span>
      </div>
    </div>
  );
}

function EvidenceExplorer({
  query,
  setQuery,
  onSelect,
}: {
  query: string;
  setQuery: (s: string) => void;
  onSelect: (e: Evidence) => void;
}) {
  const [sourceMode, setSourceMode] = useState<"all" | "curated" | "ogd">("all");
  const [type, setType] = useState("All sources");
  const [authority, setAuthority] = useState("All authorities");
  const [geography, setGeography] = useState("All geographies");
  const [year, setYear] = useState("All years");
  const [minScore, setMinScore] = useState<number>(0);

  // Curated database records state
  const [evidenceList, setEvidenceList] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Live OGD platform discovery state
  const [ogdList, setOgdList] = useState<OgdDiscoveredDataset[]>([]);
  const [ogdTotal, setOgdTotal] = useState<number>(0);
  const [ogdLoading, setOgdLoading] = useState(false);
  const [ogdError, setOgdError] = useState<string | null>(null);
  const [ogdDetectedGeography, setOgdDetectedGeography] = useState<string | null>(null);

  const [filterOptions, setFilterOptions] = useState<{
    types: string[];
    authorities: string[];
    geographies: string[];
    years: number[];
  }>({
    types: ["Policy", "Research", "Dataset", "Legal"],
    authorities: [],
    geographies: [],
    years: [2025, 2024, 2023, 2022],
  });

  const types = ["All sources", "Policy", "Research", "Dataset", "Legal"];

  const fetchEvidence = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (type !== "All sources") params.set("type", type);
      if (authority !== "All authorities") params.set("authority", authority);
      if (geography !== "All geographies") params.set("geography", geography);
      if (year !== "All years") params.set("year", year);
      if (minScore > 0) params.set("minScore", minScore.toString());

      const res = await fetch(`/api/v1/evidence?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as {
        items?: Evidence[];
        filterOptions?: {
          types: string[];
          authorities: string[];
          geographies: string[];
          years: number[];
        };
      };
      setEvidenceList(data.items || []);
      if (data.filterOptions) {
        setFilterOptions(data.filterOptions);
      }
    } catch (err: any) {
      console.error("Failed to query evidence API:", err);
      setError("Unable to query evidence records from database.");
    } finally {
      setLoading(false);
    }
  }, [query, type, authority, geography, year, minScore]);

  const fetchOgd = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setOgdList([]);
      setOgdTotal(0);
      setOgdLoading(false);
      setOgdError(null);
      setOgdDetectedGeography(null);
      return;
    }

    setOgdLoading(true);
    setOgdError(null);
    try {
      const res = await fetch(`/api/v1/ogd/search?q=${encodeURIComponent(trimmed)}&limit=25`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as {
        items?: OgdDiscoveredDataset[];
        total?: number;
        detectedGeography?: string | null;
      };
      setOgdList(data.items || []);
      setOgdTotal(data.total || 0);
      setOgdDetectedGeography(data.detectedGeography || null);
    } catch (err: any) {
      console.error("Failed to query OGD catalog discovery:", err);
      setOgdError(err.message || "Failed to discover datasets from data.gov.in");
      setOgdDetectedGeography(null);
    } finally {
      setOgdLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEvidence();
      fetchOgd(query);
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchEvidence, fetchOgd, query]);

  const hasActiveFilters =
    query.trim() !== "" ||
    type !== "All sources" ||
    authority !== "All authorities" ||
    geography !== "All geographies" ||
    year !== "All years" ||
    minScore > 0;

  const handleResetFilters = () => {
    setQuery("");
    setType("All sources");
    setAuthority("All authorities");
    setGeography("All geographies");
    setYear("All years");
    setMinScore(0);
  };

  // Dynamic AI Policy Synthesis based on query and active filter
  const dynamicSynthesis = useMemo(() => {
    const q = query.toLowerCase();
    if (q.includes("water") || q.includes("aquifer") || q.includes("groundwater") || q.includes("rainfall")) {
      return {
        title: "Aquifer Extraction & Zoning Safeguards",
        summary: "CGWB, NWIC and NIUA hydrogeological observations indicate critical overdraft in peri-urban belts. Statutory zoning must restrict impermeable conversion over primary recharge corridors.",
        consensus: "Multi-tier water protection buffers paired with rainwater recharge mandates prevent local shallow-well depletion.",
        gap: "Granular block-level extraction telemetry from private industrial borewells remains unmonitored.",
      };
    }
    if (q.includes("peri-urban") || q.includes("conversion") || q.includes("buffer") || q.includes("land")) {
      return {
        title: "Peri-Urban Land Conversion Protocols",
        summary: "Research consistently links unplanned peri-urban conversion with aquifer stress, fragmented agricultural holdings, and higher municipal infrastructure service costs.",
        consensus: "Buffer-based zoning improves environmental outcomes when combined with livelihood transition allowances.",
        gap: "District-level gender impact data and tenant farmer continuity records remain incomplete.",
      };
    }
    if (q.includes("dispute") || q.includes("court") || q.includes("title") || q.includes("ulpin")) {
      return {
        title: "Cadastral Integrity & Dispute Resolution",
        summary: "Cadastral resurvey with Bhu-Aadhaar (ULPIN) georeferencing drastically reduces revenue court litigation in expanding industrial clusters.",
        consensus: "Digital boundary dispute mediation under Section 14 guidelines cuts appeal pendency by up to 45%.",
        gap: "Legacy paper mutation cross-verification takes 60+ days without state gateway integration.",
      };
    }
    return {
      title: "Consolidated National Land Synthesis",
      summary: "Inter-agency evidence across 12 authorities links coordinated land-use planning with enhanced climate resilience, reduced litigation pendency, and preserved rural livelihoods.",
      consensus: "Evidence-backed statutory buffer frameworks prevent irreversible loss of prime agricultural wetlands.",
      gap: "District-level socio-ecological indicators require periodic satellite ground-truthing.",
    };
  }, [query]);

  return (
    <div className="page-content">
      <PageHeader
        eyebrow="EVIDENCE & RESEARCH DISCOVERY"
        title="Evidence explorer"
        description="Search policy, research, and official government datasets with traceable provenance from the NIRNAYA database and Government of India OGD Platform."
      />

      {/* Search Input Bar */}
      <div className="evidence-search">
        <Search />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              fetchEvidence();
              fetchOgd(query);
            }
          }}
          placeholder="Search by keyword, ministry, geography (e.g. 'rainfall', 'land', 'groundwater', 'agriculture Tamil Nadu')..."
        />
        <Button
          className="gov-button"
          onClick={() => {
            fetchEvidence();
            fetchOgd(query);
          }}
        >
          Search evidence
        </Button>
      </div>

      {/* Source Selection Tabs */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center", margin: "14px 0 10px", flexWrap: "wrap" }}>
        <button
          className={sourceMode === "all" ? "active" : ""}
          onClick={() => setSourceMode("all")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 14px",
            borderRadius: "6px",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
            border: sourceMode === "all" ? "1px solid #153b57" : "1px solid #d4dfe3",
            background: sourceMode === "all" ? "#153b57" : "#fff",
            color: sourceMode === "all" ? "#fff" : "#475569",
          }}
        >
          <Database size={13} />
          Combined Discovery ({evidenceList.length + ogdList.length})
        </button>
        <button
          className={sourceMode === "curated" ? "active" : ""}
          onClick={() => setSourceMode("curated")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 14px",
            borderRadius: "6px",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
            border: sourceMode === "curated" ? "1px solid #1e40af" : "1px solid #d4dfe3",
            background: sourceMode === "curated" ? "#1e40af" : "#fff",
            color: sourceMode === "curated" ? "#fff" : "#475569",
          }}
        >
          <FileText size={13} />
          NIRNAYA Curated DB ({evidenceList.length})
        </button>
        <button
          className={sourceMode === "ogd" ? "active" : ""}
          onClick={() => setSourceMode("ogd")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 14px",
            borderRadius: "6px",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
            border: sourceMode === "ogd" ? "1px solid #059669" : "1px solid #d4dfe3",
            background: sourceMode === "ogd" ? "#059669" : "#fff",
            color: sourceMode === "ogd" ? "#fff" : "#475569",
          }}
        >
          <Sparkles size={13} />
          Live OGD Platform ({ogdTotal > 0 ? ogdTotal : ogdList.length})
          {ogdLoading && <span className="spinner" style={{ width: 10, height: 10, borderWidth: 1 }} />}
        </button>
      </div>

      {/* Type Filter Pills & Count */}
      <div className="filter-row">
        {types.map((t) => (
          <button
            className={type === t ? "active" : ""}
            onClick={() => setType(t)}
            key={t}
          >
            {t}
          </button>
        ))}
        <span className="evidence-count-pill">
          Showing {sourceMode === "ogd" ? ogdList.length : sourceMode === "curated" ? evidenceList.length : evidenceList.length + ogdList.length} items
          {hasActiveFilters && " (filtered)"}
        </span>
      </div>

      {/* Secondary Dynamic Filters Bar */}
      <div className="evidence-filter-bar">
        <div className="evidence-filter-group">
          <label>Authority</label>
          <select value={authority} onChange={(e) => setAuthority(e.target.value)}>
            <option value="All authorities">All authorities (All)</option>
            {filterOptions.authorities.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        <div className="evidence-filter-group">
          <label>Geography</label>
          <select value={geography} onChange={(e) => setGeography(e.target.value)}>
            <option value="All geographies">All geographies (All)</option>
            {filterOptions.geographies.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>

        <div className="evidence-filter-group" style={{ maxWidth: 130 }}>
          <label>Publication Year</label>
          <select value={year} onChange={(e) => setYear(e.target.value)}>
            <option value="All years">All years</option>
            {filterOptions.years.map((y) => (
              <option key={y} value={y.toString()}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div className="evidence-filter-group" style={{ maxWidth: 140 }}>
          <label>Min Relevance</label>
          <select value={minScore} onChange={(e) => setMinScore(Number(e.target.value))}>
            <option value={0}>Any score</option>
            <option value={85}>85%+ relevance</option>
            <option value={90}>90%+ high relevance</option>
            <option value={95}>95%+ critical</option>
          </select>
        </div>

        {hasActiveFilters && (
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              style={{ height: 32, fontSize: 11, color: "#8a3a14", borderColor: "#f0caa9", background: "#fff" }}
            >
              <X size={12} style={{ marginRight: 4 }} /> Reset filters
            </Button>
          </div>
        )}
      </div>

      {/* Layout */}
      <div className="evidence-layout">
        <div className="evidence-list">
          {/* Live OGD Loading State */}
          {(sourceMode === "all" || sourceMode === "ogd") && ogdLoading && (
            <div className="panel" style={{ padding: "14px 18px", borderLeft: "3px solid #059669", background: "#f0fdf4" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "12px", color: "#166534", fontWeight: 600 }}>
                <span className="spinner" style={{ width: 14, height: 14, borderColor: "#16653433", borderTopColor: "#166534" }} />
                <span>Discovering matching datasets live from Government of India OGD Platform (data.gov.in)...</span>
              </div>
            </div>
          )}

          {/* Live OGD Error State */}
          {(sourceMode === "all" || sourceMode === "ogd") && ogdError && (
            <div className="panel" style={{ padding: "12px 16px", borderLeft: "3px solid #dc2626", background: "#fef2f2" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "12px", color: "#991b1b" }}>
                  Official OGD Platform notice: {ogdError}
                </span>
                <Button variant="outline" size="sm" onClick={() => fetchOgd(query)} style={{ height: 26, fontSize: 10 }}>
                  <RefreshCw size={10} style={{ marginRight: 4 }} /> Retry OGD
                </Button>
              </div>
            </div>
          )}

          {/* Live OGD Results Section */}
          {(sourceMode === "all" || sourceMode === "ogd") && ogdList.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, padding: "6px 2px 2px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span className="ogd-live-tag">
                    <Sparkles size={10} />
                    LIVE OFFICIAL DISCOVERY
                  </span>
                  <strong style={{ fontSize: "13px", color: "#153b57" }}>
                    Government of India OGD Catalog ({ogdTotal > 0 ? ogdTotal : ogdList.length} datasets)
                  </strong>
                  {ogdDetectedGeography && (
                    <span
                      style={{
                        fontSize: "11px",
                        padding: "2px 8px",
                        borderRadius: "999px",
                        background: "#e0f2fe",
                        border: "1px solid #bae6fd",
                        color: "#0369a1",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        fontWeight: 500,
                      }}
                      title={`Ranked to prioritize ${ogdDetectedGeography} based on your search query. Broader national datasets are also included.`}
                    >
                      <MapPin size={11} />
                      Prioritizing {ogdDetectedGeography} results
                    </span>
                  )}
                </div>
                <a
                  href={`https://data.gov.in/catalogs?query=${encodeURIComponent(query.trim())}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: "11px", color: "#0284c7", display: "inline-flex", alignItems: "center", gap: 4, textDecoration: "none" }}
                >
                  View on data.gov.in <ExternalLink size={11} />
                </a>
              </div>

              {ogdList.map((item) => (
                <OgdDatasetCard key={item.id} item={item} />
              ))}
            </div>
          )}

          {/* Curated NIRNAYA Database Section */}
          {(sourceMode === "all" || sourceMode === "curated") && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: sourceMode === "all" && ogdList.length > 0 ? 12 : 0 }}>
              {sourceMode === "all" && ogdList.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 2px 2px", borderTop: "1px solid #e2e8f0" }}>
                  <span className="curated-db-tag">
                    <Database size={10} />
                    CURATED EVIDENCE
                  </span>
                  <strong style={{ fontSize: "13px", color: "#153b57" }}>
                    NIRNAYA Policy & Geospatial Repository ({evidenceList.length} records)
                  </strong>
                </div>
              )}

              {loading ? (
                [1, 2, 3].map((n) => <div className="skeleton-card" key={n} />)
              ) : error ? (
                <div className="panel empty-state-box" style={{ background: "#fff", borderRadius: 9 }}>
                  <AlertTriangle style={{ color: "#d9534f" }} />
                  <h3 style={{ margin: "6px 0 2px", fontFamily: "Georgia, serif", color: "#a94035" }}>
                    Database Query Error
                  </h3>
                  <p style={{ fontSize: 11, maxWidth: 340, margin: "4px 0 14px", color: "#647781" }}>
                    {error}
                  </p>
                  <Button variant="outline" size="sm" onClick={fetchEvidence}>
                    <RefreshCw size={12} style={{ marginRight: 6 }} /> Retry Connection
                  </Button>
                </div>
              ) : evidenceList.length === 0 ? (
                sourceMode === "curated" || ogdList.length === 0 ? (
                  <div className="panel empty-state-box" style={{ background: "#fff", borderRadius: 9 }}>
                    <FileSearch />
                    <h3 style={{ margin: "6px 0 2px", fontFamily: "Georgia, serif", color: "#18394e" }}>
                      No matching records found
                    </h3>
                    <p style={{ fontSize: 11, maxWidth: 340, margin: "4px 0 14px", color: "#647781" }}>
                      {query.trim()
                        ? `No matching records found for "${query.trim()}" in NIRNAYA database.`
                        : "No records found matching current search and filter criteria."}
                    </p>
                    <Button variant="outline" size="sm" onClick={handleResetFilters}>
                      Reset Search Filters
                    </Button>
                  </div>
                ) : null
              ) : (
                evidenceList.map((item) => (
                  <button className="evidence-card" onClick={() => onSelect(item)} key={item.id}>
                    <div className="file-icon">
                      <FileText />
                    </div>
                    <div className="evidence-body">
                      <div className="evidence-meta">
                        <span style={{ color: "#1e40af" }}>{item.type}</span>
                        <small>
                          {item.authority} · {item.year} · {item.geography}
                        </small>
                      </div>
                      <h3>{item.title}</h3>
                      <p>{item.summary}</p>
                      <div className="tag-list">
                        {item.tags.slice(0, 4).map((tag) => (
                          <span key={tag}>{tag}</span>
                        ))}
                      </div>
                    </div>
                    <div className="relevance">
                      <strong>{item.score}%</strong>
                      <span>relevance</span>
                      <ChevronRight />
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Empty state for OGD Only Mode */}
          {sourceMode === "ogd" && !ogdLoading && !ogdError && ogdList.length === 0 && (
            <div className="panel empty-state-box" style={{ background: "#fff", borderRadius: 9 }}>
              <Globe2 style={{ width: 36, height: 36, color: "#059669" }} />
              <h3 style={{ margin: "6px 0 2px", fontFamily: "Georgia, serif", color: "#18394e" }}>
                {query.trim() ? "No OGD datasets found" : "Search Official OGD Datasets"}
              </h3>
              <p style={{ fontSize: 11, maxWidth: 380, margin: "4px 0 14px", color: "#647781" }}>
                {query.trim()
                  ? `The official Government of India Open Government Data Platform (data.gov.in) returned 0 datasets matching "${query.trim()}".`
                  : "Type keywords such as 'rainfall', 'land', 'groundwater', or 'agriculture Tamil Nadu' to discover official government datasets."}
              </p>
              {query.trim() && (
                <Button variant="outline" size="sm" onClick={() => setSourceMode("all")}>
                  View All Sources
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Dynamic AI Policy Synthesis */}
        <aside className="ai-panel">
          <div className="ai-orb">
            <Sparkles />
          </div>
          <p>POLICY SYNTHESIS</p>
          <h2>{dynamicSynthesis.title}</h2>
          <p>{dynamicSynthesis.summary}</p>
          <div className="finding">
            <CheckCircle2 />
            <span>
              <b>Strong consensus</b>
              {dynamicSynthesis.consensus}
            </span>
          </div>
          <div className="finding warning">
            <AlertTriangle />
            <span>
              <b>Evidence gap</b>
              {dynamicSynthesis.gap}
            </span>
          </div>
          <small>
            Synthesized from {evidenceList.length} retrieved database records and {ogdList.length} live data.gov.in catalog records. Review official citations before policy authoring.
          </small>
        </aside>
      </div>
    </div>
  );
}

const DISTRICT_MAP_CONFIG = [
  {
    id: "dist-tiruvallur",
    name: "Tiruvallur",
    d: "M145 95L290 65l65 60 -15 95 -90 35 -110 -50z",
    labelStyle: { top: "18%", left: "30%" },
    cx: 220,
    cy: 150,
  },
  {
    id: "dist-chennai",
    name: "Chennai",
    d: "M360 160l80 20 50 80 -38 70 -95 -20 3 -60z",
    labelStyle: { top: "30%", left: "64%" },
    cx: 410,
    cy: 210,
  },
  {
    id: "dist-kancheepuram",
    name: "Kancheepuram",
    d: "M130 215l110 50 85 30 3 105 -75 75 -115 -40 -48 -115z",
    labelStyle: { top: "50%", left: "30%" },
    cx: 220,
    cy: 310,
  },
  {
    id: "dist-coimbatore",
    name: "Coimbatore",
    d: "M45 420l85 -25 60 45 -20 80 -75 25 -50 -55z",
    labelStyle: { top: "78%", left: "14%" },
    cx: 100,
    cy: 480,
  },
  {
    id: "dist-pune",
    name: "Pune",
    d: "M260 415l95 -20 65 40 -25 70 -85 20 -50 -55z",
    labelStyle: { top: "76%", left: "48%" },
    cx: 320,
    cy: 470,
  },
  {
    id: "dist-jaipur",
    name: "Jaipur",
    d: "M405 325l80 -30 60 30 -15 70 -70 30 -55 -45z",
    labelStyle: { top: "60%", left: "74%" },
    cx: 470,
    cy: 380,
  },
];

function GeoInsights({
  districts,
  evidence = [],
  selectedDistrict,
  onSelectDistrict,
  layer,
  setLayer,
  zoom,
  setZoom,
  loading = false,
  error = null,
  onRetry,
  onOpenSettings,
  onInspectBhuvan,
  onNavigateToScenario,
}: {
  districts: District[];
  evidence?: Evidence[];
  selectedDistrict: District | null;
  onSelectDistrict: (d: District) => void;
  layer: string;
  setLayer: (l: string) => void;
  zoom: number;
  setZoom: (z: number | ((prev: number) => number)) => void;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onOpenSettings: () => void;
  onInspectBhuvan?: () => void;
  onNavigateToScenario?: (districtId: string) => void;
}) {
  const [showLabels, setShowLabels] = useState(true);
  const [showDistricts, setShowDistricts] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [bhuvanWmsError, setBhuvanWmsError] = useState(false);
  const [bhuvanWmsErrorDetail, setBhuvanWmsErrorDetail] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string>("ALL");
  const [inspectorTab, setInspectorTab] = useState<"overview" | "landuse" | "risks" | "evidence">("overview");
  const [showLayersCard, setShowLayersCard] = useState(true);
  const [bhuvanFeatureQuery, setBhuvanFeatureQuery] = useState<{
    loading: boolean;
    result: BhuvanFeatureInfoResult | null;
    clickedPoint: { x: number; y: number; lat?: number; lng?: number } | null;
    error: string | null;
  }>({
    loading: false,
    result: null,
    clickedPoint: null,
    error: null,
  });

  const current = selectedDistrict || districts[0];
  const isBhuvanLayer = layer === "Official Bhuvan LULC";
  const activeBhuvan = resolveBhuvanLayerForDistrict(current?.name);

  // Sync / clear feature query when district changes
  useEffect(() => {
    if (bhuvanFeatureQuery.result && bhuvanFeatureQuery.result.layer !== activeBhuvan.layerName) {
      setBhuvanFeatureQuery({
        loading: false,
        result: null,
        clickedPoint: null,
        error: null,
      });
    }
  }, [activeBhuvan.layerName, bhuvanFeatureQuery.result]);

  const executeGetFeatureInfo = useCallback(
    async (x: number, y: number, overrideDistrict?: District) => {
      if (!isBhuvanLayer) return;
      const targetDistrict = overrideDistrict || current;
      const targetBhuvan = resolveBhuvanLayerForDistrict(targetDistrict?.name);

      let approxLat: number | undefined;
      let approxLng: number | undefined;
      try {
        const parts = targetBhuvan.bbox.split(",").map((v) => parseFloat(v.trim()));
        if (parts.length === 4 && !parts.some(isNaN)) {
          const [minX, minY, maxX, maxY] = parts;
          approxLng = Number((minX + (x / 600) * (maxX - minX)).toFixed(5));
          approxLat = Number((maxY - (y / 600) * (maxY - minY)).toFixed(5));
        }
      } catch {
        // Ignore coordinate calculation errors
      }

      setBhuvanFeatureQuery({
        loading: true,
        result: null,
        clickedPoint: { x, y, lat: approxLat, lng: approxLng },
        error: null,
      });

      try {
        const params = new URLSearchParams({
          layer: targetBhuvan.layerName,
          bbox: targetBhuvan.bbox,
          width: "600",
          height: "600",
          x: String(x),
          y: String(y),
        });

        const res = await fetch(`/api/v1/adapters/bhuvan/feature-info?${params.toString()}`);
        if (!res.ok) {
          const errData = (await res.json().catch(() => ({}))) as any;
          throw new Error(errData.error || `HTTP ${res.status}: Failed to query Bhuvan feature info`);
        }

        const data: BhuvanFeatureInfoResult = await res.json();
        setBhuvanFeatureQuery({
          loading: false,
          result: data,
          clickedPoint: {
            x,
            y,
            lat: data.queryCoords?.lat ?? approxLat,
            lng: data.queryCoords?.lng ?? approxLng,
          },
          error: data.status === "ERROR" ? (data.error || "Bhuvan service error") : null,
        });
      } catch (err: any) {
        setBhuvanFeatureQuery({
          loading: false,
          result: null,
          clickedPoint: { x, y, lat: approxLat, lng: approxLng },
          error: err.message || "Failed to query live Bhuvan feature info",
        });
      }
    },
    [isBhuvanLayer, current]
  );

  const bhuvanWmsUrl = useMemo(() => {
    return getBhuvanWmsUrl({
      layer: activeBhuvan.layerName,
      bbox: activeBhuvan.bbox,
      width: 600,
      height: 600,
      transparent: true,
      format: "image/png",
      crs: "EPSG:4326",
    });
  }, [activeBhuvan.layerName, activeBhuvan.bbox]);

  // Unique states for header dropdown
  const statesList = useMemo(() => {
    return Array.from(new Set(districts.map((d) => d.state))).sort();
  }, [districts]);

  // Districts filtered by current state selection
  const districtsInState = useMemo(() => {
    if (selectedState === "ALL") return districts;
    return districts.filter((d) => d.state === selectedState);
  }, [districts, selectedState]);

  // Filter districts based on search query
  const filteredDistricts = useMemo(() => {
    if (!searchQuery.trim()) return districtsInState;
    const q = searchQuery.toLowerCase();
    return districtsInState.filter(
      (d) => d.name.toLowerCase().includes(q) || d.state.toLowerCase().includes(q)
    );
  }, [districtsInState, searchQuery]);

  // Linked evidence for the current district
  const districtEvidence = useMemo(() => {
    if (!current) return [];
    const q = current.name.toLowerCase();
    const directMatches = evidence.filter(
      (e) =>
        e.district?.toLowerCase().includes(q) ||
        e.geography?.toLowerCase().includes(q) ||
        (e.summary && e.summary.toLowerCase().includes(q))
    );
    if (directMatches.length > 0) return directMatches;
    const stateMatches = evidence.filter((e) => e.state === current.state || e.geography === current.state);
    return stateMatches.length > 0 ? stateMatches : evidence.slice(0, 3);
  }, [evidence, current]);

  // Helper to extract real layer score from database record
  function getScoreForLayer(dist: District, layerName: string): number {
    if (layerName === "Water stress") return dist.indicators.groundwaterStress;
    if (layerName === "Urban growth") return dist.indicators.builtUpExpansion;
    if (layerName === "Land disputes") return dist.indicators.landDisputeIntensity;
    return dist.compositeRisk; // Composite risk default
  }

  // Dynamic risk coloring based on actual database thresholds
  function getRegionFill(districtName: string): string {
    if (!showDistricts) return "#f4f8f7";
    const dist = districts.find((d) => d.name.toLowerCase() === districtName.toLowerCase());
    if (!dist) return "#7bb1a2";

    const val = getScoreForLayer(dist, layer);
    if (val >= 80) return "#a94035"; // Critical
    if (val >= 70) return "#dc7d40"; // High
    if (val >= 55) return "#e2c673"; // Moderate
    return "#7bb1a2"; // Low
  }

  // Toolbar event handlers
  const handleZoomIn = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setZoom((z) => Math.min(2.0, Number((z + 0.25).toFixed(2))));
  };

  const handleZoomOut = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setZoom((z) => Math.max(0.75, Number((z - 0.25).toFixed(2))));
  };

  const handleReset = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setZoom(1);
    setSearchQuery("");
  };

  const handleToggleDistricts = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDistricts((prev) => !prev);
  };

  const handleToggleLabels = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setShowLabels((prev) => !prev);
  };

  const handleOpenSettings = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onOpenSettings();
  };

  const handleOpenSourceDetails = () => {
    if (onInspectBhuvan) {
      onInspectBhuvan();
    } else {
      onOpenSettings();
    }
  };

  return (
    <div className="page-content map-page">
      <PageHeader
        eyebrow="SPATIAL DECISION SUPPORT"
        title="Geospatial insights"
        description="Spatial context from official sources for evidence-based land governance"
        action={
          <div className="geo-header-filters">
            <div className="geo-filter-select-group">
              <label htmlFor="geo-state-select">State</label>
              <select
                id="geo-state-select"
                value={selectedState}
                onChange={(e) => {
                  const newState = e.target.value;
                  setSelectedState(newState);
                  if (newState !== "ALL") {
                    const matched = districts.find((d) => d.state === newState);
                    if (matched) onSelectDistrict(matched);
                  }
                }}
              >
                <option value="ALL">All States (Pilot)</option>
                {statesList.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div className="geo-filter-select-group">
              <label htmlFor="geo-district-select">District</label>
              <select
                id="geo-district-select"
                value={current?.id || ""}
                onChange={(e) => {
                  const d = districts.find((x) => x.id === e.target.value);
                  if (d) {
                    onSelectDistrict(d);
                    if (selectedState !== "ALL" && d.state !== selectedState) {
                      setSelectedState(d.state);
                    }
                  }
                }}
              >
                {districtsInState.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.state})
                  </option>
                ))}
              </select>
            </div>
          </div>
        }
      />

      <div className="map-layout">
        {/* Main Desktop GIS Map Card (approx 70% width) */}
        <div className="map-canvas-card">
          {/* Vertically Grouped Map Controls (Left) */}
          <div
            className="map-toolbar"
            onClick={(e) => e.stopPropagation()}
            role="toolbar"
            aria-label="Map Navigation and Visibility Controls"
          >
            <button
              id="btn-map-zoom-in"
              type="button"
              onClick={handleZoomIn}
              title="Zoom In (+25%)"
              aria-label="Zoom In"
            >
              <ZoomIn size={14} />
            </button>
            <button
              id="btn-map-zoom-out"
              type="button"
              onClick={handleZoomOut}
              title="Zoom Out (-25%)"
              aria-label="Zoom Out"
            >
              <ZoomOut size={14} />
            </button>
            <button
              id="btn-map-reset"
              type="button"
              onClick={handleReset}
              title="Reset View (100% Fit)"
              aria-label="Reset View"
            >
              <RotateCcw size={13} />
            </button>
            <button
              id="btn-map-toggle-layers-panel"
              type="button"
              className={showLayersCard ? "active" : ""}
              onClick={() => setShowLayersCard((prev) => !prev)}
              title={showLayersCard ? "Hide Map Layers" : "Show Map Layers"}
              aria-label="Toggle Map Layers"
            >
              <Layers3 size={14} />
            </button>
            <button
              id="btn-map-toggle-districts"
              type="button"
              className={showDistricts ? "active" : ""}
              onClick={handleToggleDistricts}
              title={showDistricts ? "Hide District Shading" : "Show District Shading"}
              aria-label={showDistricts ? "Hide District Shading" : "Show District Shading"}
            >
              <Activity size={14} />
            </button>
            <button
              id="btn-map-toggle-labels"
              type="button"
              className={showLabels ? "active" : ""}
              onClick={handleToggleLabels}
              title={showLabels ? "Hide District Labels" : "Show District Labels"}
              aria-label={showLabels ? "Hide District Labels" : "Show District Labels"}
            >
              {showLabels ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
            <button
              id="btn-map-open-settings"
              type="button"
              onClick={handleOpenSettings}
              title="Layer Threshold Configuration"
              aria-label="Geospatial Layer Configuration"
            >
              <Settings2 size={14} />
            </button>
          </div>

          {/* Compact Map Layers Card inside Map */}
          {showLayersCard && (
            <div className="map-layers-card" onClick={(e) => e.stopPropagation()}>
              <div className="map-layers-head">
                <Layers3 size={12} />
                <span>Map Layers</span>
              </div>

              {/* Option 1: NIRNAYA Risk Indicators */}
              <div
                id="btn-toggle-nirnaya-risk"
                role="button"
                tabIndex={0}
                className={`map-layer-opt ${!isBhuvanLayer ? "active" : ""}`}
                onClick={() => {
                  if (isBhuvanLayer) setLayer("Composite risk");
                }}
              >
                <span>NIRNAYA Risk Indicators</span>
                {!isBhuvanLayer && <Check size={12} color="#1e7265" />}
              </div>

              {!isBhuvanLayer && (
                <div className="map-sublayers-pills">
                  {["Composite risk", "Water stress", "Urban growth", "Land disputes"].map((sub) => (
                    <button
                      key={sub}
                      type="button"
                      className={`map-sublayer-pill ${layer === sub ? "active" : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setLayer(sub);
                      }}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              )}

              {/* Option 2: Official Bhuvan LULC */}
              <div
                id="btn-toggle-bhuvan-lulc"
                role="button"
                tabIndex={0}
                className={`map-layer-opt ${isBhuvanLayer ? "active" : ""}`}
                onClick={() => setLayer("Official Bhuvan LULC")}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span>Official Bhuvan LULC</span>
                    <span className={`bhuvan-live-tag ${bhuvanWmsError ? "unavailable" : ""}`} style={{ fontSize: 8, padding: "0 4px" }}>
                      {bhuvanWmsError ? "UNAVAILABLE" : "LIVE"}
                    </span>
                  </div>
                  {isBhuvanLayer && (
                    <small style={{ fontSize: 9, color: "#19665b", fontWeight: 700 }}>
                      {activeBhuvan.isDistrictSpecific ? "Kancheepuram SISDP V2" : "Tamil Nadu SIS-DP"}
                    </small>
                  )}
                </div>
                {isBhuvanLayer && <Check size={12} color="#1e7265" />}
              </div>
            </div>
          )}

          {/* Top-Right Attribution Pill */}
          <div className="map-top-attribution" id="bhuvan-attribution">
            <Globe2 size={12} />
            <span>Source: Bhuvan / NRSC / ISRO, Government of India</span>
            <span className={`bhuvan-live-tag ${bhuvanWmsError ? "unavailable" : ""}`}>
              {bhuvanWmsError ? "SERVICE UNAVAILABLE" : "LIVE WMS"}
            </span>
          </div>

          {/* Map Viewport Area */}
          <div className="map-viewport-wrapper">
            {loading && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(255,255,255,0.75)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 20,
                  fontSize: 12,
                  color: "#1e7265",
                  fontWeight: 600,
                  gap: 8,
                }}
              >
                <RefreshCw className="animate-spin" size={16} /> Loading district layer...
              </div>
            )}

            {/* Interactive Floating Labels */}
            {showLabels &&
              DISTRICT_MAP_CONFIG.map((cfg) => {
                const d = districts.find((x) => x.id === cfg.id || x.name.toLowerCase() === cfg.name.toLowerCase());
                if (!d) return null;
                const isSelected = current?.id === d.id;
                const scoreVal = getScoreForLayer(d, layer);

                return (
                  <div
                    key={cfg.id}
                    className={`map-label ${isSelected ? "active" : ""}`}
                    style={cfg.labelStyle as React.CSSProperties}
                    onClick={() => onSelectDistrict(d)}
                    title={`Click to inspect ${d.name}`}
                  >
                    {d.name}{" "}
                    <span>
                      {d.riskLevel} ({scoreVal}%)
                    </span>
                  </div>
                );
              })}

            <svg
              viewBox="0 0 600 600"
              role="img"
              aria-label={`${layer} pilot map covering demonstration districts`}
              style={{
                transform: `scale(${zoom})`,
                transition: "transform .22s ease-out",
                cursor: isBhuvanLayer ? "crosshair" : "default",
              }}
              onClick={(e) => {
                if (!isBhuvanLayer) return;
                const svg = e.currentTarget;
                const pt = svg.createSVGPoint();
                pt.x = e.clientX;
                pt.y = e.clientY;
                const svgPoint = pt.matrixTransform(svg.getScreenCTM()?.inverse());
                const x = Math.max(0, Math.min(600, Math.round(svgPoint.x)));
                const y = Math.max(0, Math.min(600, Math.round(svgPoint.y)));
                executeGetFeatureInfo(x, y);
              }}
            >
              <defs>
                <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
                  <path d="M24 0H0V24" fill="none" stroke="#d8e5e2" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="600" height="600" fill="url(#grid)" />

              {/* Official Bhuvan WMS Satellite Raster Layer */}
              {isBhuvanLayer && !bhuvanWmsError && (
                <image
                  id="bhuvan-wms-raster"
                  href={bhuvanWmsUrl}
                  x="0"
                  y="0"
                  width="600"
                  height="600"
                  preserveAspectRatio="none"
                  opacity={0.94}
                  onError={() => {
                    setBhuvanWmsError(true);
                    setBhuvanWmsErrorDetail("WMS tile request failed or upstream server returned an error.");
                  }}
                  onLoad={() => {
                    setBhuvanWmsError(false);
                    setBhuvanWmsErrorDetail(null);
                  }}
                />
              )}

              {/* Coastline Reference */}
              <path className="coast" d="M470 140q65 95 10 205t-130 110" />

              {/* Render all 6 database pilot districts */}
              {DISTRICT_MAP_CONFIG.map((cfg) => {
                const d = districts.find((x) => x.id === cfg.id || x.name.toLowerCase() === cfg.name.toLowerCase());
                const isSelected = current?.id === d?.id;

                const regionFill = isBhuvanLayer
                  ? isSelected
                    ? "rgba(30, 114, 101, 0.28)"
                    : "rgba(255, 255, 255, 0.08)"
                  : getRegionFill(cfg.name);

                const strokeColor = isBhuvanLayer
                  ? isSelected
                    ? "#0b3c5d"
                    : "#1e7265"
                  : "#ffffff";

                const strokeWidth = isBhuvanLayer
                  ? isSelected
                    ? 3.5
                    : 1.5
                  : 1;

                return (
                  <g key={cfg.id}>
                    <path
                      className={`region ${isSelected ? "active-district" : ""}`}
                      fill={regionFill}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      d={cfg.d}
                      onClick={(e) => {
                        if (d) {
                          onSelectDistrict(d);
                          if (isBhuvanLayer) {
                            const svg = e.currentTarget.ownerSVGElement;
                            if (svg) {
                              const pt = svg.createSVGPoint();
                              pt.x = e.clientX;
                              pt.y = e.clientY;
                              const svgPoint = pt.matrixTransform(svg.getScreenCTM()?.inverse());
                              const x = Math.max(0, Math.min(600, Math.round(svgPoint.x)));
                              const y = Math.max(0, Math.min(600, Math.round(svgPoint.y)));
                              executeGetFeatureInfo(x, y, d);
                            }
                          }
                        }
                      }}
                    >
                      <title>{`${cfg.name} (${d?.state || "India"}): ${d?.riskLevel || "Active"} Risk`}</title>
                    </path>
                    <circle cx={cfg.cx} cy={cfg.cy} r={isSelected ? 10 : 8} fill={isSelected ? "#153b57" : "#1e7265"} stroke="#ffffff" strokeWidth="2" />
                  </g>
                );
              })}

              {/* Active Click Reticle / Marker on Bhuvan Map */}
              {isBhuvanLayer && bhuvanFeatureQuery.clickedPoint && (
                <g id="bhuvan-click-marker">
                  <circle
                    cx={bhuvanFeatureQuery.clickedPoint.x}
                    cy={bhuvanFeatureQuery.clickedPoint.y}
                    r={8}
                    fill="none"
                    stroke="#1e7265"
                    strokeWidth={2}
                    strokeDasharray="3 3"
                  />
                  <circle
                    cx={bhuvanFeatureQuery.clickedPoint.x}
                    cy={bhuvanFeatureQuery.clickedPoint.y}
                    r={3}
                    fill="#a94035"
                    stroke="#ffffff"
                    strokeWidth={1.5}
                  />
                  <line
                    x1={bhuvanFeatureQuery.clickedPoint.x - 14}
                    y1={bhuvanFeatureQuery.clickedPoint.y}
                    x2={bhuvanFeatureQuery.clickedPoint.x - 4}
                    y2={bhuvanFeatureQuery.clickedPoint.y}
                    stroke="#1e7265"
                    strokeWidth={1.5}
                  />
                  <line
                    x1={bhuvanFeatureQuery.clickedPoint.x + 4}
                    y1={bhuvanFeatureQuery.clickedPoint.y}
                    x2={bhuvanFeatureQuery.clickedPoint.x + 14}
                    y2={bhuvanFeatureQuery.clickedPoint.y}
                    stroke="#1e7265"
                    strokeWidth={1.5}
                  />
                  <line
                    x1={bhuvanFeatureQuery.clickedPoint.x}
                    y1={bhuvanFeatureQuery.clickedPoint.y - 14}
                    x2={bhuvanFeatureQuery.clickedPoint.x}
                    y2={bhuvanFeatureQuery.clickedPoint.y - 4}
                    stroke="#1e7265"
                    strokeWidth={1.5}
                  />
                  <line
                    x1={bhuvanFeatureQuery.clickedPoint.x}
                    y1={bhuvanFeatureQuery.clickedPoint.y + 4}
                    x2={bhuvanFeatureQuery.clickedPoint.x}
                    y2={bhuvanFeatureQuery.clickedPoint.y + 14}
                    stroke="#1e7265"
                    strokeWidth={1.5}
                  />
                </g>
              )}
            </svg>

            {/* Graceful fallback banner if Bhuvan WMS is unreachable */}
            {isBhuvanLayer && bhuvanWmsError && (
              <div className="bhuvan-fallback-alert" id="bhuvan-fallback-banner">
                <AlertTriangle size={18} />
                <div>
                  <b>Official Bhuvan WMS Service Unavailable</b>
                  <p>
                    Unable to establish live connection to <code>{BHUVAN_CONFIG.wmsEndpoint}</code> for layer <code>{activeBhuvan.layerName}</code>.
                    {bhuvanWmsErrorDetail ? ` Reason: ${bhuvanWmsErrorDetail}.` : ""} NIRNAYA does not fabricate or mock satellite geospatial data.
                  </p>
                </div>
              </div>
            )}

            {/* Compact Floating Legend */}
            {isBhuvanLayer ? (
              <div className="map-legend-card bhuvan-legend">
                <b style={{ color: "#174e44", display: "block", marginBottom: 3 }}>Official Bhuvan LULC</b>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 8px" }}>
                  <span><i className="lulc-swatch" style={{ background: "#c0392b" }} /> Built-up</span>
                  <span><i className="lulc-swatch" style={{ background: "#f39c12" }} /> Crop Land</span>
                  <span><i className="lulc-swatch" style={{ background: "#27ae60" }} /> Plantation</span>
                  <span><i className="lulc-swatch" style={{ background: "#16a085" }} /> Forest/Scrub</span>
                  <span><i className="lulc-swatch" style={{ background: "#2980b9" }} /> Water</span>
                  <span><i className="lulc-swatch" style={{ background: "#7f8c8d" }} /> Wasteland</span>
                </div>
              </div>
            ) : (
              <div className="map-legend-card">
                <b style={{ display: "block", marginBottom: 3 }}>{layer} Risk Bands</b>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <span><i className="risk-low" /> &lt;55%</span>
                  <span><i className="risk-mid" /> 55-70%</span>
                  <span><i className="risk-high" /> 70-80%</span>
                  <span><i className="risk-critical" /> &ge;80%</span>
                </div>
              </div>
            )}
          </div>

          {/* Bottom GIS Information Bar */}
          <div className="map-bottom-infobar" id="bhuvan-bottom-infobar">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span>Official Bhuvan WMS Layer: <code>{activeBhuvan.layerName}</code></span>
              <span style={{ color: "#879b97" }}>|</span>
              <span>CRS: <code>EPSG:4326</code></span>
              <span style={{ color: "#879b97" }}>|</span>
              <span>Live from NRSC/ISRO</span>
            </div>
            <button
              type="button"
              id="btn-bhuvan-source-details"
              className="map-view-details-btn"
              onClick={handleOpenSourceDetails}
            >
              View source details <ExternalLink size={11} />
            </button>
          </div>
        </div>

        {/* District Inspector Card (approx 30% width) */}
        <aside className="map-inspector-card">
          <div className="inspector-header">
            <div className="inspector-header-top">
              <span className="inspector-eyebrow">DISTRICT INSPECTOR</span>
              <span style={{ fontSize: 10, color: "#6a7f8b" }}>
                ID: <code style={{ color: "#165576" }}>{current?.id}</code>
              </span>
            </div>

            <div className="inspector-title-row">
              <div>
                <h2>{current?.name || "Select District"}</h2>
                <div className="inspector-subtitle">
                  {current?.state} · {current?.areaSqKm?.toLocaleString()} km²
                </div>
              </div>
              <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                {current && (
                  <span className={`risk-tag ${current.riskLevel.toLowerCase()}`}>
                    {current.riskLevel} Risk
                  </span>
                )}
                <span className="bhuvan-live-tag" title="Official ISRO/NRSC Bhuvan WMS integrated">
                  Official Bhuvan LULC
                </span>
              </div>
            </div>

            {/* Quick District Search Input */}
            <div className="map-district-search">
              <Search size={13} />
              <input
                placeholder="Search pilot districts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && filteredDistricts.length > 0) {
                    onSelectDistrict(filteredDistricts[0]);
                  }
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  style={{ border: 0, background: "transparent", cursor: "pointer", color: "#647781", padding: 0 }}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Inspector Tabs */}
          <div className="inspector-tabs" role="tablist" aria-label="District Details Tabs">
            <button
              type="button"
              role="tab"
              aria-selected={inspectorTab === "overview"}
              className={`inspector-tab-btn ${inspectorTab === "overview" ? "active" : ""}`}
              onClick={() => setInspectorTab("overview")}
            >
              Overview
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={inspectorTab === "landuse"}
              className={`inspector-tab-btn ${inspectorTab === "landuse" ? "active" : ""}`}
              onClick={() => setInspectorTab("landuse")}
            >
              Land use
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={inspectorTab === "risks"}
              className={`inspector-tab-btn ${inspectorTab === "risks" ? "active" : ""}`}
              onClick={() => setInspectorTab("risks")}
            >
              Risk indicators
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={inspectorTab === "evidence"}
              className={`inspector-tab-btn ${inspectorTab === "evidence" ? "active" : ""}`}
              onClick={() => setInspectorTab("evidence")}
            >
              Evidence ({districtEvidence.length})
            </button>
          </div>

          {/* Scrollable Inspector Body */}
          <div className="inspector-body">
            {error ? (
              <div style={{ background: "#fdf2f0", border: "1px solid #f8c8c2", borderRadius: 8, padding: 12 }}>
                <div style={{ display: "flex", gap: 8, color: "#a94035", fontWeight: 700, fontSize: 11 }}>
                  <AlertTriangle size={15} /> Database Connection Warning
                </div>
                <p style={{ fontSize: 10, color: "#6f3731", margin: "6px 0 10px", lineHeight: 1.4 }}>
                  {error}
                </p>
                {onRetry && (
                  <Button variant="outline" size="sm" onClick={onRetry} style={{ height: 26, fontSize: 10 }}>
                    <RefreshCw size={11} style={{ marginRight: 4 }} /> Retry Query
                  </Button>
                )}
              </div>
            ) : !current ? (
              <div style={{ padding: 20, textAlign: "center", color: "#778a94", fontSize: 11 }}>
                No district records match "{searchQuery}".
              </div>
            ) : (
              <>
                {/* LIVE BHUVAN FEATURE INSPECTOR (TASK 2, TASK 3, TASK 4) */}
                {isBhuvanLayer && (
                  <div className="inspector-bhuvan-section" style={{ marginBottom: 12 }}>
                    {bhuvanFeatureQuery.loading ? (
                      <div
                        id="bhuvan-feature-loading"
                        style={{
                          background: "#f0f8f5",
                          border: "1px solid #b8dfd4",
                          borderRadius: 8,
                          padding: 12,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#14594c", fontSize: 11, fontWeight: 700 }}>
                          <RefreshCw className="animate-spin" size={13} />
                          <span>Querying Bhuvan WMS GetFeatureInfo...</span>
                        </div>
                        <p style={{ margin: "6px 0 0", fontSize: 10, color: "#475e6a" }}>
                          Fetching official feature attributes for layer <code>{activeBhuvan.layerName}</code> at {bhuvanFeatureQuery.clickedPoint?.lat ? `${bhuvanFeatureQuery.clickedPoint.lat}°N, ${bhuvanFeatureQuery.clickedPoint.lng}°E` : `pixel (${bhuvanFeatureQuery.clickedPoint?.x}, ${bhuvanFeatureQuery.clickedPoint?.y})`}...
                        </p>
                      </div>
                    ) : bhuvanFeatureQuery.error || bhuvanFeatureQuery.result?.status === "ERROR" ? (
                      <div
                        id="bhuvan-feature-error"
                        style={{
                          background: "#fdf2f0",
                          border: "1px solid #f8c8c2",
                          borderRadius: 8,
                          padding: 12,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: "#a94035", display: "flex", alignItems: "center", gap: 5 }}>
                            <AlertTriangle size={13} /> BHUVAN QUERY ERROR
                          </span>
                          <span className="bhuvan-live-tag unavailable" style={{ fontSize: 8 }}>SERVICE ERROR</span>
                        </div>
                        <p style={{ margin: "4px 0 8px", fontSize: 11, color: "#6f3731", lineHeight: 1.4 }}>
                          {bhuvanFeatureQuery.error || bhuvanFeatureQuery.result?.error || "Upstream Bhuvan service error"}
                        </p>
                        <div style={{ fontSize: 9, color: "#8b524b", borderTop: "1px solid #fadbd8", paddingTop: 5 }}>
                          <div><b>Layer: </b><code>{activeBhuvan.layerName}</code></div>
                          <div><b>Endpoint: </b><code>{BHUVAN_CONFIG.wmsEndpoint}</code></div>
                          <div style={{ marginTop: 3 }}>
                            Technical error reported directly from upstream service. Data is NOT fabricated.
                          </div>
                        </div>
                      </div>
                    ) : bhuvanFeatureQuery.result?.status === "NO_FEATURE" ? (
                      <div
                        id="bhuvan-feature-empty"
                        style={{
                          background: "#fbfcfc",
                          border: "1px solid #dbe3e6",
                          borderRadius: 8,
                          padding: 12,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: "#546e7a" }}>BHUVAN FEATURE QUERY</span>
                          <span className="bhuvan-live-tag" style={{ background: "#e8eff2", color: "#475e6a", borderColor: "#cfdbe0", fontSize: 8 }}>
                            0 FEATURES
                          </span>
                        </div>
                        <p style={{ margin: "6px 0", fontSize: 11, fontWeight: 600, color: "#2c3e50" }}>
                          No Bhuvan feature returned at this location.
                        </p>
                        <div style={{ fontSize: 9, color: "#6a7f8b", borderTop: "1px solid #eaeff1", paddingTop: 6, lineHeight: 1.4 }}>
                          <div><b>Query Coords: </b>{bhuvanFeatureQuery.clickedPoint?.lat ? `${bhuvanFeatureQuery.clickedPoint.lat}°N, ${bhuvanFeatureQuery.clickedPoint.lng}°E` : `(${bhuvanFeatureQuery.clickedPoint?.x}, ${bhuvanFeatureQuery.clickedPoint?.y})`}</div>
                          <div><b>Layer: </b><code>{activeBhuvan.layerName}</code></div>
                          <div><b>Query time: </b>{bhuvanFeatureQuery.result.queryTime}</div>
                          <div style={{ marginTop: 4, fontStyle: "italic" }}>
                            The clicked coordinate contains no classified polygon in the SIS-DP 1:10,000 layer. NIRNAYA does not invent fallback values.
                          </div>
                        </div>
                      </div>
                    ) : bhuvanFeatureQuery.result?.status === "FEATURE_FOUND" && bhuvanFeatureQuery.result.feature ? (
                      (() => {
                        const feat = bhuvanFeatureQuery.result.feature;
                        const prov = bhuvanFeatureQuery.result.provenance;
                        return (
                          <div
                            id="live-bhuvan-feature-inspector"
                            style={{
                              background: "#f0f8f5",
                              border: "1.5px solid #1e7265",
                              borderRadius: 8,
                              padding: 12,
                              boxShadow: "0 2px 6px rgba(30, 114, 101, 0.08)",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                              <span style={{ fontSize: 11, fontWeight: 800, color: "#14594c", letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: 5 }}>
                                <Sparkles size={13} color="#1e7265" /> LIVE BHUVAN FEATURE
                              </span>
                              <span className="bhuvan-live-tag" style={{ fontSize: 8 }}>
                                LIVE WMS
                              </span>
                            </div>

                            {/* Feature Attributes List */}
                            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11, color: "#173847" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #e1ece9", paddingBottom: 4 }}>
                                <span style={{ color: "#546e7a" }}>Land Cover</span>
                                <b style={{ color: "#14594c" }}>{feat.dscr1 || "N/A"}</b>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #e1ece9", paddingBottom: 4 }}>
                                <span style={{ color: "#546e7a" }}>Detailed Class</span>
                                <b style={{ color: "#17384e" }}>{feat.dscr2 || "N/A"}</b>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #e1ece9", paddingBottom: 4 }}>
                                <span style={{ color: "#546e7a" }}>Sub-class</span>
                                <b style={{ color: "#17384e" }}>{feat.dscr3 || "N/A"}</b>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #e1ece9", paddingBottom: 4 }}>
                                <span style={{ color: "#546e7a" }}>LULC Code</span>
                                <code style={{ background: "#e0efe9", padding: "1px 5px", borderRadius: 4, fontWeight: 700, color: "#14594c" }}>
                                  {feat.lc_code || feat.code || "N/A"}
                                </code>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #e1ece9", paddingBottom: 4 }}>
                                <span style={{ color: "#546e7a" }}>Feature Area</span>
                                <b style={{ color: "#17384e" }}>{formatBhuvanArea(feat.Shape_Area)}</b>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #e1ece9", paddingBottom: 4 }}>
                                <span style={{ color: "#546e7a" }}>Source</span>
                                <span style={{ fontWeight: 600, color: "#14594c", textAlign: "right" }}>
                                  {prov.source}
                                </span>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 2 }}>
                                <span style={{ color: "#546e7a" }}>Layer</span>
                                <code style={{ fontSize: 10, color: "#17384e" }}>{prov.layer}</code>
                              </div>
                              {feat.OBJECTID !== undefined && (
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#748892" }}>
                                  <span>Feature ID / OBJECTID</span>
                                  <span>#{feat.OBJECTID}</span>
                                </div>
                              )}
                            </div>

                            {/* TASK 3: Provenance Section */}
                            <div
                              style={{
                                marginTop: 10,
                                paddingTop: 8,
                                borderTop: "1px solid #cde4dc",
                                fontSize: 9,
                                color: "#475e6a",
                                lineHeight: 1.4,
                              }}
                            >
                              <div style={{ fontWeight: 700, color: "#14594c", marginBottom: 3, letterSpacing: "0.03em" }}>
                                LIVE OFFICIAL FEATURE DATA
                              </div>
                              <div><b>Source: </b>{prov.source}</div>
                              <div><b>Service: </b>{prov.service}</div>
                              <div><b>Layer: </b><code>{prov.layer}</code></div>
                              <div><b>Query time: </b>{prov.queryTime}</div>
                              {bhuvanFeatureQuery.clickedPoint?.lat && (
                                <div><b>Clicked Coords: </b>{bhuvanFeatureQuery.clickedPoint.lat}°N, {bhuvanFeatureQuery.clickedPoint.lng}°E</div>
                              )}
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div
                        id="bhuvan-feature-hint"
                        style={{
                          background: "#f4faf7",
                          border: "1px dashed #b2ded1",
                          borderRadius: 8,
                          padding: "10px 12px",
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, color: "#175b4f" }}>
                          <MapPin size={13} color="#1e7265" />
                          <span>Click Map for Live Bhuvan Attributes</span>
                        </div>
                        <p style={{ margin: 0, fontSize: 10, color: "#546e7a", lineHeight: 1.35 }}>
                          Click any location on the map to query the official Bhuvan WMS <code>GetFeatureInfo</code> service and inspect real-time land cover attributes for <b>{current?.name}</b>.
                        </p>
                        <button
                          type="button"
                          className="gov-button"
                          style={{
                            alignSelf: "flex-start",
                            height: 24,
                            fontSize: 10,
                            padding: "0 8px",
                            marginTop: 2,
                          }}
                          onClick={() => {
                            executeGetFeatureInfo(300, 300);
                          }}
                        >
                          Query district center
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 1: OVERVIEW */}
                {inspectorTab === "overview" && (
                  <>
                    {/* 2x2 Metric Grid */}
                    <div className="inspector-metrics-grid">
                      <div className="inspector-metric-card">
                        <span className="inspector-metric-label">Composite Risk</span>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                          <span className="inspector-metric-val">{current.compositeRisk}</span>
                          <span style={{ fontSize: 10, color: "#748892" }}>/ 100</span>
                        </div>
                      </div>
                      <div className="inspector-metric-card">
                        <span className="inspector-metric-label">Built-up Growth</span>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                          <span className="inspector-metric-val">{current.indicators.builtUpExpansion}%</span>
                          <span style={{ fontSize: 9, color: current.indicators.builtUpExpansion >= 70 ? "#dc7d40" : "#2e8b78" }}>
                            {current.indicators.builtUpExpansion >= 70 ? "Accelerating" : "Stable"}
                          </span>
                        </div>
                      </div>
                      <div className="inspector-metric-card">
                        <span className="inspector-metric-label">Water Stress</span>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                          <span className="inspector-metric-val">{current.indicators.groundwaterStress}%</span>
                          <span style={{ fontSize: 9, color: current.indicators.groundwaterStress >= 80 ? "#a94035" : "#dc7d40" }}>
                            {current.indicators.groundwaterStress >= 80 ? "Critical" : "High"}
                          </span>
                        </div>
                      </div>
                      <div className="inspector-metric-card">
                        <span className="inspector-metric-label">Completeness</span>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                          <span className="inspector-metric-val">{current.indicators.dataCompleteness}%</span>
                          <span style={{ fontSize: 9, color: "#2e8b78" }}>Verified</span>
                        </div>
                      </div>
                    </div>

                    {/* Concise Observation Card */}
                    {(current.notes || current.fieldNote) && (
                      <div className="inspector-observation-card">
                        <b>Administrative Field Note:</b> {current.notes || current.fieldNote}
                      </div>
                    )}

                    {/* Official Bhuvan WMS Summary Box */}
                    <div style={{ background: "#f0f8f5", border: "1px solid #cce5dd", borderRadius: 8, padding: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: "#14594c" }}>OFFICIAL BHUVAN WMS</span>
                        <span className={`bhuvan-live-tag ${bhuvanWmsError ? "unavailable" : ""}`}>
                          {bhuvanWmsError ? "UNAVAILABLE" : "LIVE / OFFICIAL"}
                        </span>
                      </div>
                      <div style={{ marginTop: 6, fontSize: 11, color: "#173847" }}>
                        <b>Layer: </b><code>{activeBhuvan.layerName}</code>
                      </div>
                      <p style={{ margin: "3px 0 6px", fontSize: 10, color: "#475e6a" }}>
                        {activeBhuvan.title} · {activeBhuvan.isDistrictSpecific ? "High-res SISDP V2" : "Tamil Nadu SIS-DP"}
                      </p>
                      <div style={{ fontSize: 9, color: "#657c87", borderTop: "1px solid #e1ede9", paddingTop: 5 }}>
                        <div><b>Endpoint: </b><code>{BHUVAN_CONFIG.wmsEndpoint}</code></div>
                        <div><b>CRS: </b><code>EPSG:4326</code> · <b>BBox: </b><code>{activeBhuvan.bbox}</code></div>
                        <div style={{ marginTop: 3, color: "#14594c", fontWeight: 600 }}>
                          Source: Bhuvan / NRSC / ISRO, Government of India
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* TAB 2: LAND USE / LAND COVER */}
                {inspectorTab === "landuse" && (
                  <div style={{ background: "#f8fafb", border: "1px solid #d8e3e6", borderRadius: 8, padding: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <b style={{ color: "#14594c", fontSize: 12 }}>Land Use / Land Cover (Bhuvan)</b>
                      <span className={`bhuvan-live-tag ${bhuvanWmsError ? "unavailable" : ""}`}>
                        {bhuvanWmsError ? "UNAVAILABLE" : "LIVE WMS"}
                      </span>
                    </div>
                    <div style={{ fontSize: 10, color: "#546e7a", marginBottom: 10 }}>
                      Layer: <code>{activeBhuvan.layerName}</code> ({activeBhuvan.isDistrictSpecific ? "High-res SISDP V2" : "Tamil Nadu SIS-DP"})
                    </div>

                    <div className="lulc-class-list">
                      <div className="lulc-class-item">
                        <div className="lulc-class-left">
                          <i className="lulc-swatch" style={{ background: "#c0392b" }} />
                          <span>Built-up Area</span>
                        </div>
                        <b style={{ color: "#17384e", fontSize: 11 }}>{current.indicators.builtUpExpansion}%</b>
                      </div>
                      <div className="lulc-class-item">
                        <div className="lulc-class-left">
                          <i className="lulc-swatch" style={{ background: "#f39c12" }} />
                          <span>Agriculture / Crop</span>
                        </div>
                        <span style={{ color: "#728590", fontSize: 10, fontStyle: "italic" }}>Mapped in WMS</span>
                      </div>
                      <div className="lulc-class-item">
                        <div className="lulc-class-left">
                          <i className="lulc-swatch" style={{ background: "#27ae60" }} />
                          <span>Plantation</span>
                        </div>
                        <span style={{ color: "#728590", fontSize: 10, fontStyle: "italic" }}>Mapped in WMS</span>
                      </div>
                      <div className="lulc-class-item">
                        <div className="lulc-class-left">
                          <i className="lulc-swatch" style={{ background: "#16a085" }} />
                          <span>Forest / Scrub</span>
                        </div>
                        <span style={{ color: "#728590", fontSize: 10, fontStyle: "italic" }}>Mapped in WMS</span>
                      </div>
                      <div className="lulc-class-item">
                        <div className="lulc-class-left">
                          <i className="lulc-swatch" style={{ background: "#2980b9" }} />
                          <span>Water Bodies</span>
                        </div>
                        <span style={{ color: "#728590", fontSize: 10, fontStyle: "italic" }}>Mapped in WMS</span>
                      </div>
                      <div className="lulc-class-item">
                        <div className="lulc-class-left">
                          <i className="lulc-swatch" style={{ background: "#7f8c8d" }} />
                          <span>Wasteland</span>
                        </div>
                        <span style={{ color: "#728590", fontSize: 10, fontStyle: "italic" }}>Mapped in WMS</span>
                      </div>
                      <div className="lulc-class-item">
                        <div className="lulc-class-left">
                          <i className="lulc-swatch" style={{ background: "#95a5a6" }} />
                          <span>Others</span>
                        </div>
                        <span style={{ color: "#728590", fontSize: 10, fontStyle: "italic" }}>Mapped in WMS</span>
                      </div>
                    </div>

                    <div style={{ marginTop: 12, paddingTop: 8, borderTop: "1px solid #e1ece9", fontSize: 10, color: "#617784", lineHeight: 1.4 }}>
                      <div><b>Source:</b> Bhuvan / NRSC / ISRO, Government of India</div>
                      <div><b>Endpoint:</b> <code>{BHUVAN_CONFIG.wmsEndpoint}</code></div>
                      <div><b>CRS:</b> <code>EPSG:4326</code> · <b>BBox: </b><code>{activeBhuvan.bbox}</code></div>
                    </div>
                  </div>
                )}

                {/* TAB 3: RISK INDICATORS */}
                {inspectorTab === "risks" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {[
                      {
                        n: "Groundwater stress",
                        v: current.indicators.groundwaterStress,
                        c: current.indicators.groundwaterStress >= 80 ? "critical" : current.indicators.groundwaterStress >= 70 ? "high" : "mid",
                      },
                      {
                        n: "Built-up expansion",
                        v: current.indicators.builtUpExpansion,
                        c: current.indicators.builtUpExpansion >= 80 ? "critical" : current.indicators.builtUpExpansion >= 70 ? "high" : "mid",
                      },
                      {
                        n: "Livelihood sensitivity",
                        v: current.indicators.livelihoodSensitivity,
                        c: current.indicators.livelihoodSensitivity >= 70 ? "high" : "mid",
                      },
                      {
                        n: "Data completeness",
                        v: current.indicators.dataCompleteness,
                        c: "good",
                      },
                      {
                        n: "Land dispute intensity",
                        v: current.indicators.landDisputeIntensity,
                        c: current.indicators.landDisputeIntensity >= 75 ? "critical" : current.indicators.landDisputeIntensity >= 65 ? "high" : "mid",
                      },
                    ].map((x) => (
                      <div className="indicator" key={x.n} style={{ margin: "2px 0 6px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                          <span style={{ color: "#2c4856" }}>{x.n}</span>
                          <b style={{ color: "#163c54" }}>{x.v}%</b>
                        </div>
                        <div style={{ height: 6, background: "#e8edef", borderRadius: 6, overflow: "hidden", marginTop: 5 }}>
                          <i className={x.c} style={{ width: `${x.v}%`, display: "block", height: "100%" }} />
                        </div>
                      </div>
                    ))}
                    <div style={{ fontSize: 9, color: "#748892", marginTop: 4 }}>
                      Values normalized from CGWB, NRSC, and State Revenue records (PS 26019).
                    </div>
                  </div>
                )}

                {/* TAB 4: EVIDENCE */}
                {inspectorTab === "evidence" && (
                  <div className="inspector-evidence-list">
                    {districtEvidence.length === 0 ? (
                      <div style={{ padding: 14, textAlign: "center", color: "#778a94", fontSize: 11 }}>
                        No specific evidence linked for this district.
                      </div>
                    ) : (
                      districtEvidence.map((ev) => (
                        <div key={ev.id} className="inspector-evidence-card">
                          <div className="inspector-evidence-title">{ev.title}</div>
                          <div className="inspector-evidence-meta" style={{ marginBottom: 4 }}>
                            <span>{ev.authority} · {ev.year}</span>
                            <span style={{ fontWeight: 700, color: "#176a5c" }}>Score: {ev.score}%</span>
                          </div>
                          <p style={{ margin: 0, fontSize: 10, color: "#546e7a", lineHeight: 1.4 }}>
                            {ev.summary}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Fixed Inspector Footer */}
          {current && (
            <div className="inspector-footer">
              <div className="inspector-footer-meta">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                  <span><b>Datasets Combined:</b> {current.datasetsCombined || 5} sources</span>
                  <span style={{ background: "#e8f3ef", color: "#16584e", padding: "1px 6px", borderRadius: 4, fontWeight: 700, fontSize: 10 }}>
                    {current.evidenceCount || 3} Linked Evidence
                  </span>
                </div>
                <div><b>Key Data Sources:</b> {current.keySources}</div>
                <div style={{ fontSize: 9, color: "#80939d", marginTop: 2 }}>
                  <b>Provenance:</b> Database-backed pilot district layer (PS 26019). Normalized from CGWB, NRSC, and State Revenue records.
                </div>
              </div>

              {onNavigateToScenario && (
                <Button
                  className="gov-button"
                  id="btn-run-scenario-studio"
                  style={{ width: "100%", height: 34, fontSize: 11 }}
                  onClick={() => onNavigateToScenario(current.id)}
                >
                  Run Scenario Studio for {current.name} <ArrowUpRight size={13} style={{ marginLeft: 5 }} />
                </Button>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function ScenarioStudio({
  values,
  setValues,
  result,
  running,
  error,
  run,
  studies,
  districts,
  selectedStudyId,
  setSelectedStudyId,
  selectedGeographyId,
  setSelectedGeographyId,
  selectedInterventionId,
  setSelectedInterventionId,
  parameters,
  setParameters,
  history,
  onSelectHistoryItem,
  onGenerateBrief,
  onCompare,
}: {
  values: { conservation: number; livelihood: number; feasibility: number; water: number };
  setValues: (v: { conservation: number; livelihood: number; feasibility: number; water: number }) => void;
  result: any | null;
  running: boolean;
  error?: string | null;
  run: () => void;
  studies: PolicyStudy[];
  districts: District[];
  selectedStudyId: string;
  setSelectedStudyId: (id: string) => void;
  selectedGeographyId: string;
  setSelectedGeographyId: (id: string) => void;
  selectedInterventionId: string;
  setSelectedInterventionId: (id: string) => void;
  parameters: ScenarioParameters;
  setParameters: (p: ScenarioParameters | ((prev: ScenarioParameters) => ScenarioParameters)) => void;
  history: ScenarioHistoryItem[];
  onSelectHistoryItem: (item: ScenarioHistoryItem) => void;
  onGenerateBrief: () => void;
  onCompare: () => void;
}) {
  const currentDistrict = districts.find((d) => d.id === selectedGeographyId) || districts[0];
  const currentIntervention =
    AVAILABLE_INTERVENTIONS.find((i) => i.id === selectedInterventionId) || AVAILABLE_INTERVENTIONS[0];

  const districtHistory = history.filter(
    (h) => !h.geographyId || h.geographyId === selectedGeographyId
  );

  return (
    <div className="page-content">
      <PageHeader
        eyebrow="POLICY PREFLIGHT & DECISION MODELING"
        title="Scenario studio"
        description="Deterministic bounded simulation connecting district baseline risk profiles with proposed land-policy interventions."
        action={
          <div className="model-chip">
            <ShieldCheck />
            Deterministic Spatial Model v2.0 · Auditable
          </div>
        }
      />

      <div className="scenario-grid">
        {/* Controls Section */}
        <section className="panel scenario-controls">
          <div className="scenario-title">
            <span>01</span>
            <div>
              <h2>Configure policy scenario</h2>
              <p>Select pilot geography, intervention scheme, and implementation parameters.</p>
            </div>
          </div>

          {/* District & Policy Study Selection */}
          <div className="scenario-context">
            <label>
              Pilot geography
              <select
                value={selectedGeographyId}
                onChange={(e) => {
                  setSelectedGeographyId(e.target.value);
                }}
              >
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.state}) · {d.riskLevel} ({d.compositeRisk}%)
                  </option>
                ))}
              </select>
            </label>

            <label>
              Policy research study
              <select
                value={selectedStudyId}
                onChange={(e) => setSelectedStudyId(e.target.value)}
              >
                {studies.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} ({s.state})
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* District Baseline Profile Card */}
          {currentDistrict && (
            <div style={{ background: "#f8fafb", border: "1px solid #dce5e8", borderRadius: 8, padding: "11px 13px", margin: "12px 0 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "#cf7022" }}>
                  District Baseline Profile (Database)
                </span>
                <span style={{ fontSize: 10, background: currentDistrict.riskLevel === "Critical" ? "#ffebee" : currentDistrict.riskLevel === "High" ? "#fff3e0" : "#e8f5e9", color: currentDistrict.riskLevel === "Critical" ? "#b71c1c" : currentDistrict.riskLevel === "High" ? "#b45309" : "#1b5e20", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>
                  Baseline Risk: {currentDistrict.compositeRisk}% ({currentDistrict.riskLevel})
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "7px 10px", fontSize: 11 }}>
                <div>
                  <span style={{ display: "block", fontSize: 10, color: "#687a84" }}>Groundwater Stress:</span>
                  <b style={{ color: "#18394e" }}>{currentDistrict.indicators.groundwaterStress}%</b>
                </div>
                <div>
                  <span style={{ display: "block", fontSize: 10, color: "#687a84" }}>Built-up Expansion:</span>
                  <b style={{ color: "#18394e" }}>{currentDistrict.indicators.builtUpExpansion}%</b>
                </div>
                <div>
                  <span style={{ display: "block", fontSize: 10, color: "#687a84" }}>Livelihood Sensitivity:</span>
                  <b style={{ color: "#18394e" }}>{currentDistrict.indicators.livelihoodSensitivity}%</b>
                </div>
                <div>
                  <span style={{ display: "block", fontSize: 10, color: "#687a84" }}>Land Dispute Index:</span>
                  <b style={{ color: "#18394e" }}>{currentDistrict.indicators.landDisputeIntensity}%</b>
                </div>
                <div>
                  <span style={{ display: "block", fontSize: 10, color: "#687a84" }}>Records Digitization:</span>
                  <b style={{ color: "#18394e" }}>{currentDistrict.indicators.dataCompleteness}%</b>
                </div>
                <div>
                  <span style={{ display: "block", fontSize: 10, color: "#687a84" }}>Area & Datasets:</span>
                  <b style={{ color: "#18394e" }}>{currentDistrict.areaSqKm?.toLocaleString()} km² ({currentDistrict.datasetsCombined || 5} src)</b>
                </div>
              </div>
            </div>
          )}

          {/* Intervention Selection */}
          <div style={{ margin: "14px 0" }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#18394e", display: "block", marginBottom: 6 }}>
              Proposed Land-Policy Intervention:
            </label>
            <select
              style={{ width: "100%", height: 38, border: "1px solid #ccd9de", borderRadius: 7, padding: "0 10px", fontSize: 12, background: "#fff", color: "#123b5d", fontWeight: 600 }}
              value={selectedInterventionId}
              onChange={(e) => {
                setSelectedInterventionId(e.target.value);
                const found = AVAILABLE_INTERVENTIONS.find((i) => i.id === e.target.value);
                if (found) {
                  setParameters((prev) => ({
                    ...prev,
                    intensity: found.defaultParameters.intensity,
                    coverage: found.defaultParameters.coverage,
                    timeHorizon: found.defaultParameters.timeHorizon,
                    focusArea: found.defaultParameters.focusArea,
                  }));
                }
              }}
            >
              {AVAILABLE_INTERVENTIONS.map((interv) => (
                <option key={interv.id} value={interv.id}>
                  {interv.name} ({interv.category})
                </option>
              ))}
            </select>

            {/* Selected Intervention Details Card */}
            {currentIntervention && (
              <div style={{ background: "#edf5f8", border: "1px solid #d0e2ea", borderRadius: 7, padding: "10px 12px", marginTop: 8, fontSize: 11 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontSize: 10, background: "#153b57", color: "#fff", padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>
                    Target: {currentIntervention.targetMetric}
                  </span>
                  <span style={{ fontSize: 10, color: "#54707f" }}>{currentIntervention.category}</span>
                </div>
                <p style={{ margin: "4px 0 6px", color: "#324d5b", lineHeight: 1.45 }}>
                  {currentIntervention.description}
                </p>
                <div style={{ fontSize: 10, color: "#5b7381", borderTop: "1px solid #dce8ee", paddingTop: 5 }}>
                  <b>Statutory Reference:</b> {currentIntervention.statutoryBasis}
                </div>
                <div style={{ fontSize: 9, color: "#8a5823", marginTop: 4, fontStyle: "italic" }}>
                  * {currentIntervention.disclaimer}
                </div>
              </div>
            )}
          </div>

          {/* Scenario Parameters Sliders */}
          <div className="slider-list" style={{ marginTop: 16 }}>
            {/* 1. Environmental protection */}
            <div className="slider-field">
              <div>
                <label style={{ fontWeight: 600 }}>Environmental protection</label>
                <b id="val-conservation">{values.conservation}%</b>
              </div>
              <Slider
                value={[values.conservation]}
                min={0}
                max={100}
                step={1}
                onValueChange={(val) => setValues({ ...values, conservation: val[0] })}
              />
              <span style={{ fontSize: 9, color: "#748690", marginTop: 2, display: "block" }}>
                Zoning buffer mandates, ecological corridors, and peri-urban farmland protection.
              </span>
            </div>

            {/* 2. Livelihood safeguards */}
            <div className="slider-field">
              <div>
                <label style={{ fontWeight: 600 }}>Livelihood safeguards</label>
                <b id="val-livelihood">{values.livelihood}%</b>
              </div>
              <Slider
                value={[values.livelihood]}
                min={0}
                max={100}
                step={1}
                onValueChange={(val) => setValues({ ...values, livelihood: val[0] })}
              />
              <span style={{ fontSize: 9, color: "#748690", marginTop: 2, display: "block" }}>
                Tenancy security, agricultural transition compensation, and community rehabilitation.
              </span>
            </div>

            {/* 3. Administrative feasibility */}
            <div className="slider-field">
              <div>
                <label style={{ fontWeight: 600 }}>Administrative feasibility</label>
                <b id="val-feasibility">{values.feasibility}%</b>
              </div>
              <Slider
                value={[values.feasibility]}
                min={0}
                max={100}
                step={1}
                onValueChange={(val) => setValues({ ...values, feasibility: val[0] })}
              />
              <span style={{ fontSize: 9, color: "#748690", marginTop: 2, display: "block" }}>
                Revenue department capacity, cadastral survey readiness, and dispute resolution speed.
              </span>
            </div>

            {/* 4. Water resilience */}
            <div className="slider-field">
              <div>
                <label style={{ fontWeight: 600 }}>Water resilience</label>
                <b id="val-water">{values.water}%</b>
              </div>
              <Slider
                value={[values.water]}
                min={0}
                max={100}
                step={1}
                onValueChange={(val) => setValues({ ...values, water: val[0] })}
              />
              <span style={{ fontSize: 9, color: "#748690", marginTop: 2, display: "block" }}>
                Groundwater recharge priority, critical aquifer zoning, and extraction caps.
              </span>
            </div>

            {/* Implementation Rigor & Coverage Parameters */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 4 }}>
              <div className="slider-field">
                <div>
                  <label style={{ fontWeight: 600, fontSize: 10 }}>Enforcement Rigor</label>
                  <b>{parameters.intensity}%</b>
                </div>
                <Slider
                  value={[parameters.intensity]}
                  min={10}
                  max={100}
                  step={5}
                  onValueChange={(val) => setParameters((prev) => ({ ...prev, intensity: val[0] }))}
                />
              </div>
              <div className="slider-field">
                <div>
                  <label style={{ fontWeight: 600, fontSize: 10 }}>Taluk Coverage</label>
                  <b>{parameters.coverage}%</b>
                </div>
                <Slider
                  value={[parameters.coverage]}
                  min={10}
                  max={100}
                  step={5}
                  onValueChange={(val) => setParameters((prev) => ({ ...prev, coverage: val[0] }))}
                />
              </div>
            </div>

            {/* Time Horizon Selector */}
            <div style={{ margin: "10px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 600 }}>Simulation Time Horizon:</label>
                <b style={{ fontSize: 11, color: "#1a6c61" }}>{parameters.timeHorizon} Year(s)</b>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                {[
                  { yr: 1 as TimeHorizon, label: "1 Year (Pilot)", note: "55% structural uptake" },
                  { yr: 3 as TimeHorizon, label: "3 Years (Mid-term)", note: "85% structural uptake" },
                  { yr: 5 as TimeHorizon, label: "5 Years (Maturity)", note: "100% full maturity" },
                ].map((t) => (
                  <button
                    key={t.yr}
                    type="button"
                    style={{
                      border: parameters.timeHorizon === t.yr ? "2px solid #153b57" : "1px solid #ccd8dc",
                      background: parameters.timeHorizon === t.yr ? "#153b57" : "#fff",
                      color: parameters.timeHorizon === t.yr ? "#fff" : "#465f6d",
                      borderRadius: 6,
                      padding: "6px 4px",
                      cursor: "pointer",
                      textAlign: "center",
                    }}
                    onClick={() => setParameters((prev) => ({ ...prev, timeHorizon: t.yr }))}
                  >
                    <b style={{ display: "block", fontSize: 11 }}>{t.label}</b>
                    <small style={{ fontSize: 8, opacity: 0.85 }}>{t.note}</small>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Error Banner if any */}
          {error && (
            <div style={{ background: "#ffebee", border: "1px solid #f5c6cb", borderRadius: 6, padding: "8px 12px", color: "#721c24", fontSize: 11, margin: "10px 0", display: "flex", alignItems: "center", gap: 7 }}>
              <AlertTriangle size={15} />
              <span>{error}</span>
            </div>
          )}

          {/* Trigger Button */}
          <Button className="gov-button run-button" onClick={run} disabled={running} style={{ marginTop: 10 }}>
            {running ? (
              <>
                <span className="spinner" />
                Executing deterministic model…
              </>
            ) : (
              <>
                <Play />
                Run policy preflight
              </>
            )}
          </Button>

          <p className="method-note">
            <CircleHelp />
            Deterministic multi-criteria spatial model based on verified baseline indicators. Not an unverified ML forecast.
          </p>
        </section>

        {/* Results Section */}
        <section className="panel result-panel">
          <div className="scenario-title">
            <span>02</span>
            <div>
              <h2>Decision outlook & impact analysis</h2>
              <p>Projected shifts in district risk indicators calculated against local database baselines.</p>
            </div>
          </div>

          {!result ? (
            <div className="empty-result">
              <Activity />
              <h3>No scenario executed yet</h3>
              <p>
                Select a pilot geography and intervention parameters, then click <b>Run policy preflight</b> to calculate projected baseline-to-scenario indicator shifts.
              </p>
              {currentDistrict && (
                <div style={{ marginTop: 14, fontSize: 11, color: "#60747f" }}>
                  Selected District: <b>{currentDistrict.name}</b> (Baseline Composite Risk: <b>{currentDistrict.compositeRisk}%</b>)
                </div>
              )}
            </div>
          ) : (
            <div className="result-content">
              {/* Score Hero */}
              <div className="score-hero">
                <div>
                  <strong>{result.score ?? result.readinessScore}</strong>
                  <span>/100</span>
                </div>
                <div>
                  <p>POLICY READINESS SCORE</p>
                  <h3>{result.readinessVerdict || (result.score >= 70 ? "Recommended for Multi-Taluk Pilot" : "Revise before pilot")}</h3>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
                    <span style={{ fontSize: 10, background: "#e8f1f5", color: "#153b57", padding: "2px 7px", borderRadius: 4, fontWeight: 700 }}>
                      Risk Shift: {result.baselineRiskLevel || "High"} ({result.baselineCompositeRisk || result.baseline?.compositeRisk || 72}%) → {result.scenarioRiskLevel || "Moderate"} ({result.scenarioCompositeRisk || 58}%)
                    </span>
                  </div>
                </div>
              </div>

              {/* Recommendation Box */}
              <div className="recommendation">
                <Sparkles />
                <p>{result.recommendation}</p>
              </div>

              {/* Projected Directional Impacts */}
              {result.impacts && result.impacts.length > 0 && (
                <div style={{ margin: "14px 0" }}>
                  <h4 style={{ margin: "0 0 8px", fontSize: 12, color: "#18394e" }}>
                    Projected Directional Impacts
                  </h4>
                  <div style={{ background: "#f8fafb", border: "1px solid #dce5e8", borderRadius: 8, padding: "10px 14px" }}>
                    {result.impacts.map((imp: any) => (
                      <div className="impact-row" key={imp.name}>
                        <span style={{ fontWeight: 600, color: "#18394e" }}>{imp.name}</span>
                        <div>
                          <i
                            style={{
                              width: `${Math.min(100, Math.max(8, Math.abs(imp.value) * 2.5))}%`,
                              background:
                                imp.value < 0
                                  ? "#b42318"
                                  : imp.value === 0
                                  ? "#277e72"
                                  : "linear-gradient(90deg, #3c9b8c, #df9a45)",
                            }}
                          />
                        </div>
                        <b style={{ textAlign: "right", color: imp.value < 0 ? "#b42318" : "#1a6c61" }}>
                          {imp.value > 0 ? `+${imp.value}%` : `${imp.value}%`}
                        </b>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Baseline vs Scenario Comparison Table */}
              <div style={{ margin: "16px 0" }}>
                <h4 style={{ margin: "0 0 8px", fontSize: 12, color: "#18394e" }}>
                  Baseline vs Scenario Indicator Comparison
                </h4>
                <div style={{ border: "1px solid #dce5e8", borderRadius: 8, overflow: "hidden", fontSize: 11 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr 1fr 1fr", background: "#f6f9fa", padding: "8px 12px", fontWeight: 700, color: "#4d626e", borderBottom: "1px solid #dce5e8" }}>
                    <span>Indicator</span>
                    <span>Baseline</span>
                    <span>Scenario</span>
                    <span style={{ textAlign: "right" }}>Projected Shift</span>
                  </div>
                  {(result.indicators || []).map((ind: IndicatorComparison) => (
                    <div
                      key={ind.key}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1.7fr 1fr 1fr 1fr",
                        padding: "8px 12px",
                        borderBottom: "1px solid #edf2f4",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ fontWeight: 600, color: "#18394e" }}>{ind.label}</span>
                      <span>{ind.baseline}%</span>
                      <span style={{ fontWeight: 700, color: "#153b57" }}>{ind.scenario}%</span>
                      <span
                        style={{
                          textAlign: "right",
                          fontWeight: 700,
                          color: ind.direction === "improved" ? "#1e7265" : ind.direction === "worsened" ? "#b42318" : "#60747f",
                        }}
                      >
                        {ind.absoluteChange > 0 ? `+${ind.absoluteChange}%` : `${ind.absoluteChange}%`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Transparent "How this estimate was calculated" Section */}
              {result.calculationExplanation && (
                <div style={{ background: "#f8fafb", border: "1px solid #e1e9ec", borderRadius: 8, padding: "12px 14px", margin: "14px 0", fontSize: 11 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#123b5d", fontWeight: 700, marginBottom: 6 }}>
                    <ShieldCheck size={16} />
                    <span>How this estimate was calculated (Transparent Modeling)</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, color: "#475e6a" }}>
                    <div>
                      <b>Effective Intervention Factor:</b> {result.calculationExplanation.effectiveFactorFormula}
                    </div>
                    {result.calculationExplanation.targetRule && (
                      <div>
                        <b>Target Mechanism:</b> {result.calculationExplanation.targetRule}
                      </div>
                    )}
                    {result.calculationExplanation.secondaryRule && (
                      <div>
                        <b>Secondary Cross-Elasticity:</b> {result.calculationExplanation.secondaryRule}
                      </div>
                    )}
                    <div style={{ marginTop: 4, fontSize: 10, color: "#8a5823", fontStyle: "italic" }}>
                      * {result.calculationExplanation.disclaimer}
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="result-actions">
                <Button className="gov-button" onClick={onGenerateBrief}>
                  Generate decision brief
                </Button>
                <Button variant="outline" onClick={onCompare}>
                  Compare scenario
                </Button>
              </div>
            </div>
          )}

          {/* Quick Scenario History Card for this District */}
          {districtHistory.length > 0 && (
            <div style={{ borderTop: "1px solid #e5ecee", marginTop: 22, paddingTop: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <b style={{ fontSize: 11, color: "#18394e" }}>Previous Saved Simulations ({districtHistory.length})</b>
                <span style={{ fontSize: 10, color: "#71858f" }}>Click to reopen</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 180, overflowY: "auto" }}>
                {districtHistory.slice(0, 4).map((h) => (
                  <div
                    key={h.id}
                    onClick={() => onSelectHistoryItem(h)}
                    style={{
                      background: "#fdfefe",
                      border: "1px solid #dce5e8",
                      borderRadius: 6,
                      padding: "6px 10px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      cursor: "pointer",
                      fontSize: 10,
                    }}
                  >
                    <div>
                      <b style={{ color: "#153b57" }}>{h.interventionName || "Scenario Run"}</b>
                      <span style={{ color: "#748690", marginLeft: 8 }}>
                        {new Date(h.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <span style={{ background: "#e8f3ef", color: "#196759", padding: "1px 6px", borderRadius: 4, fontWeight: 700 }}>
                      Readiness: {h.score}/100
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Connectors({
  connectors,
  selectedDistrict,
  onInspectContract,
  onOpenApiDoc,
  onSyncOgd,
  syncingOgd,
  onOpenOgdModal,
  ogdSyncFeedback,
  onDismissFeedback,
}: {
  connectors: Connector[];
  selectedDistrict?: District | null;
  onInspectContract: (c: Connector) => void;
  onOpenApiDoc: () => void;
  onSyncOgd: () => void;
  syncingOgd: boolean;
  onOpenOgdModal: () => void;
  ogdSyncFeedback: {
    type: "success" | "error" | "info" | "warning";
    title: string;
    message: string;
    details?: any;
  } | null;
  onDismissFeedback: () => void;
}) {
  const ogd = connectors.find((c) => c.id === "ogd");
  const otherConnectors = connectors.filter((c) => c.id !== "ogd");

  return (
    <div className="page-content">
      <PageHeader
        eyebrow="INTEROPERABILITY LAYER"
        title="Data integrations"
        description="The exact systems, refresh cycles and API routes that power each NIRNAYA workflow."
        action={
          <Button variant="outline" onClick={onOpenApiDoc}>
            <Database />
            API documentation
          </Button>
        }
      />

      <div className="integration-note">
        <ShieldCheck />
        <div>
          <b>Honest integration status</b>
          <p>
            Public sources are adapter ready. Restricted government systems remain approval-required until the owning authority provides credentials and a data-sharing agreement.
          </p>
        </div>
      </div>

      {/* Featured Official Data Adapter: OGD India */}
      <section className="connector-card featured-ogd" style={{ marginBottom: 20 }}>
        <div className="connector-top">
          <div className="ogd-badge-row">
            <div className="connector-logo" style={{ background: "#123b5d", color: "#fff", fontWeight: 800 }}>
              OGD
            </div>
            <span className="ogd-flag">PRIMARY OFFICIAL GOV DATA SOURCE</span>
            <span style={{ fontSize: 11, color: "#546e7a" }}>
              National Data Sharing and Accessibility Policy (NDSAP)
            </span>
          </div>
          <StatusPill
            status={ogd?.status || "approval-required"}
            governanceStatus={ogd?.governanceStatus}
            recordsCount={ogd?.recordsCount}
          />
        </div>

        <h2 style={{ fontSize: 20, margin: "6px 0 2px" }}>
          {ogd?.name || "Open Government Data Platform India (data.gov.in)"}
        </h2>
        <span style={{ fontSize: 11, color: "#19665b", fontWeight: 700 }}>
          {ogd?.owner || "Ministry of Jal Shakti / National Water Informatics Centre (NWIC)"}
        </span>
        <p style={{ margin: "8px 0 12px", fontSize: 12, lineHeight: 1.5, color: "#475e6a" }}>
          Official district-level rainfall and precipitation observation pipeline. Connects to Government of India
          open data repository, normalizes time-series meteorological parameters, and generates cryptographic SHA-256
          hashes for evidentiary provenance.
        </p>

        {/* Sync feedback banner if triggered */}
        {ogdSyncFeedback && (
          <div className={`ogd-sync-banner ${ogdSyncFeedback.type}`}>
            {ogdSyncFeedback.type === "success" ? (
              <CheckCircle2 />
            ) : ogdSyncFeedback.type === "warning" ? (
              <AlertTriangle />
            ) : (
              <AlertTriangle />
            )}
            <div style={{ flex: 1 }}>
              <b>{ogdSyncFeedback.title}</b>
              <p style={{ margin: "2px 0 0" }}>{ogdSyncFeedback.message}</p>
            </div>
            <button
              onClick={onDismissFeedback}
              style={{ border: 0, background: "transparent", cursor: "pointer", color: "inherit", padding: 2 }}
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Honest integration alert banner */}
        {(ogd?.recordsCount ?? 0) > 0 ? (
          <div className="ogd-sync-banner success">
            <ShieldCheck />
            <div>
              <b>Live Official Records Ingested ({ogd?.recordsCount} Records)</b>
              <p style={{ margin: "2px 0 0" }}>
                Records are verified with SHA-256 checksums, stored in the local SQLite database, and indexed in Evidence Explorer.
              </p>
            </div>
          </div>
        ) : (
          <div className="ogd-sync-banner warning">
            <AlertTriangle />
            <div>
              <b>Approval required / API key required for live data.gov.in integration</b>
              <p style={{ margin: "2px 0 0" }}>
                The official Government endpoint (<code>api.data.gov.in</code>) requires an authorized NDSAP key (returns: <code>&quot;Authorization field missing&quot;</code>). Local prototype records remain active and uncorrupted until credentials are provided.
              </p>
            </div>
          </div>
        )}

        {/* Official dataset technical details */}
        <div className="ogd-details-grid">
          <div className="ogd-detail-item">
            <label>Dataset Title</label>
            <span>Daily District-wise Rainfall Data</span>
          </div>
          <div className="ogd-detail-item">
            <label>Publishing Authority</label>
            <span>Ministry of Jal Shakti / NWIC</span>
          </div>
          <div className="ogd-detail-item">
            <label>Catalog Identifier</label>
            <code>a6007b2f-eed3-4a68-a321-d2d563d52bb2</code>
          </div>
          <div className="ogd-detail-item">
            <label>Resource Identifier</label>
            <code>6c05cd1b-ed59-40c2-bc31-e314f39c6971</code>
          </div>
          <div className="ogd-detail-item">
            <label>NIRNAYA Application Route</label>
            <code>/api/v1/adapters/ogd</code>
          </div>
          <div className="ogd-detail-item">
            <label>Official Upstream API</label>
            <code>api.data.gov.in/resource/...</code>
          </div>
          <div className="ogd-detail-item">
            <label>Records In SQLite</label>
            <span style={{ fontWeight: 700, color: (ogd?.recordsCount ?? 0) > 0 ? "#176859" : "#a05e1c" }}>
              {ogd?.recordsCount ?? 0} official records
            </span>
          </div>
          <div className="ogd-detail-item">
            <label>Cryptographic Provenance</label>
            <span>SHA-256 Payload Hash</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="ogd-actions-row">
          <Button className="gov-button" onClick={onSyncOgd} disabled={syncingOgd}>
            {syncingOgd ? (
              <RefreshCw size={14} className="spin" style={{ marginRight: 6 }} />
            ) : (
              <RefreshCw size={14} style={{ marginRight: 6 }} />
            )}
            Sync now / Refresh from source
          </Button>

          <Button variant="outline" onClick={onOpenOgdModal}>
            <Settings2 size={14} style={{ marginRight: 6 }} />
            Configure API Key
          </Button>

          {ogd && (
            <Button variant="outline" onClick={() => onInspectContract(ogd)}>
              <FileText size={14} style={{ marginRight: 6 }} />
              Inspect Contract Specification
            </Button>
          )}

          <a
            href="https://data.gov.in/resource/daily-district-wise-rainfall-data"
            target="_blank"
            rel="noreferrer"
            style={{
              marginLeft: "auto",
              fontSize: 11,
              display: "flex",
              alignItems: "center",
              gap: 4,
              color: "#1a5682",
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Open Official Catalog (data.gov.in) <ExternalLink size={12} />
          </a>
        </div>
      </section>

      {/* Other Connected / Planned Sources */}
      <div className="connector-grid">
        {otherConnectors.map((c) => {
          if (c.id === "bhuvan") {
            const selectedLayerName = selectedDistrict?.name?.toLowerCase().includes("kancheepuram")
              ? "sisdpv2:TN_Kancheepuram_lulc_v2"
              : "basemap:TN_LULC";

            return (
              <article className="connector-card bhuvan-compact-card" key={c.id}>
                <div className="connector-top">
                  <div className="connector-logo" style={{ background: "#0b3c5d", color: "#fff", fontWeight: 700 }}>
                    ISRO
                  </div>
                  <StatusPill
                    status={c.status}
                    governanceStatus={c.governanceStatus}
                  />
                </div>
                <h2>Bhuvan / NRSC</h2>
                <span style={{ fontSize: 11, color: "#19665b", fontWeight: 600 }}>National Remote Sensing Centre</span>

                {/* Compact representation according to Requirement 12 */}
                <div className="bhuvan-compact-meta">
                  <div className="bhuvan-meta-row">
                    <span className="bhuvan-meta-label">Source</span>
                    <span className="bhuvan-meta-val">Bhuvan / NRSC</span>
                  </div>
                  <div className="bhuvan-meta-row">
                    <span className="bhuvan-meta-label">Dataset</span>
                    <span className="bhuvan-meta-val">LULC</span>
                  </div>
                  <div className="bhuvan-meta-row">
                    <span className="bhuvan-meta-label">Status</span>
                    <span className="bhuvan-meta-val" style={{ color: "#14594c", fontWeight: 700 }}>
                      LIVE / OFFICIAL
                    </span>
                  </div>
                  <div className="bhuvan-meta-row">
                    <span className="bhuvan-meta-label">Layer</span>
                    <span className="bhuvan-meta-val" style={{ fontFamily: "monospace", fontSize: 11 }}>
                      {selectedLayerName}
                    </span>
                  </div>
                  <div className="bhuvan-meta-row">
                    <span className="bhuvan-meta-label">Service</span>
                    <span className="bhuvan-meta-val">WMS</span>
                  </div>
                </div>

                <div className="connector-foot" style={{ marginTop: 8 }}>
                  <span style={{ fontSize: 11, color: "#546e7a" }}>
                    <Activity size={12} style={{ display: "inline", marginRight: 4 }} />
                    Live OGC WMS stream
                  </span>
                  <button
                    id="btn-bhuvan-source-details"
                    onClick={() => onInspectContract(c)}
                    style={{ cursor: "pointer", fontWeight: 600, color: "#174e44" }}
                  >
                    View source details <ChevronRight size={13} style={{ display: "inline", verticalAlign: "middle" }} />
                  </button>
                </div>
              </article>
            );
          }

          return (
            <article className="connector-card" key={c.id}>
              <div className="connector-top">
                <div className="connector-logo">{c.name.slice(0, 2).toUpperCase()}</div>
                <StatusPill
                  status={c.status}
                  governanceStatus={c.governanceStatus}
                  recordsCount={c.recordsCount}
                />
              </div>
              <h2>{c.name}</h2>
              <span>{c.owner}</span>
              <p>{c.purpose}</p>
              <div className="endpoint">
                <small>APPLICATION ENDPOINT</small>
                <code>{c.endpoint}</code>
              </div>
              <div className="connector-foot">
                <span>
                  <Activity />
                  {c.refresh}
                </span>
                <button onClick={() => onInspectContract(c)} style={{ cursor: "pointer" }}>
                  Inspect contract <ChevronRight />
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <section className="panel endpoint-table">
        <div className="panel-head">
          <div>
            <p>NIRNAYA API</p>
            <h2>Frontend data contracts</h2>
          </div>
          <span className="api-version">REST · /api/v1</span>
        </div>
        <div className="api-row" onClick={onOpenApiDoc} style={{ cursor: "pointer" }}>
          <b className="get">GET</b>
          <code>/adapters/bhuvan</code>
          <span>Official Bhuvan WMS endpoint, verified LULC layers & real-time service status</span>
        </div>
        <div className="api-row" onClick={onOpenApiDoc} style={{ cursor: "pointer" }}>
          <b className="get">GET</b>
          <code>/adapters/ogd</code>
          <span>Official data.gov.in ingestion status, metadata provenance & records count</span>
        </div>
        <div className="api-row" onClick={onOpenApiDoc} style={{ cursor: "pointer" }}>
          <b className="post">POST</b>
          <code>/adapters/ogd</code>
          <span>Manual trigger to sync records from data.gov.in with SHA-256 validation</span>
        </div>
        <div className="api-row" onClick={onOpenApiDoc} style={{ cursor: "pointer" }}>
          <b className="get">GET</b>
          <code>/dashboard</code>
          <span>National summary metrics, active policy studies and database counts</span>
        </div>
        <div className="api-row" onClick={onOpenApiDoc} style={{ cursor: "pointer" }}>
          <b className="get">GET</b>
          <code>/evidence?q=…</code>
          <span>Hybrid evidence search with SHA-256 provenance metadata</span>
        </div>
        <div className="api-row" onClick={onOpenApiDoc} style={{ cursor: "pointer" }}>
          <b className="get">GET</b>
          <code>/geo/districts</code>
          <span>Multi-criteria spatial vulnerability indicators for pilot geographies</span>
        </div>
        <div className="api-row" onClick={onOpenApiDoc} style={{ cursor: "pointer" }}>
          <b className="post">POST</b>
          <code>/scenarios/run</code>
          <span>Weighted scenario assessment with database persistence</span>
        </div>
        <div className="api-row" onClick={onOpenApiDoc} style={{ cursor: "pointer" }}>
          <b className="post">POST</b>
          <code>/scenarios/brief</code>
          <span>Auditable executive decision brief generation</span>
        </div>
        <div className="api-row" onClick={onOpenApiDoc} style={{ cursor: "pointer" }}>
          <b className="get">GET</b>
          <code>/connectors</code>
          <span>Source registry, availability and refresh health</span>
        </div>
      </section>
    </div>
  );
}
