import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const evidence = sqliteTable("evidence", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  type: text("type").notNull(), // 'Policy' | 'Research' | 'Dataset' | 'Legal'
  authority: text("authority").notNull(),
  year: integer("year").notNull(),
  geography: text("geography").notNull(),
  state: text("state"),
  district: text("district"),
  score: integer("score").notNull(), // relevance 0-100
  summary: text("summary").notNull(),
  tags: text("tags").notNull(), // JSON string array
  sourceUrl: text("source_url").notNull(),
  checksum: text("checksum").notNull(),
  provenanceDate: text("provenance_date").notNull(),
  verified: integer("verified").notNull().default(1),
  citation: text("citation"),
  methodologyNote: text("methodology_note"),
});

export const policyStudies = sqliteTable("policy_studies", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  state: text("state").notNull(),
  district: text("district"),
  stage: text("stage").notNull(),
  stageKey: text("stage_key").notNull(),
  readinessScore: integer("readiness_score").notNull(),
  owner: text("owner").notNull(),
  summary: text("summary").notNull(),
  priority: text("priority").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const districts = sqliteTable("districts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  state: text("state").notNull(),
  areaSqKm: integer("area_sq_km").notNull(),
  compositeRisk: integer("composite_risk").notNull(),
  riskLevel: text("risk_level").notNull(), // 'Critical' | 'High' | 'Moderate' | 'Low'
  groundwaterStress: integer("groundwater_stress").notNull(),
  builtUpExpansion: integer("built_up_expansion").notNull(),
  livelihoodSensitivity: integer("livelihood_sensitivity").notNull(),
  dataCompleteness: integer("data_completeness").notNull(),
  landDisputeIntensity: integer("land_dispute_intensity").notNull(),
  datasetsCombined: integer("datasets_combined").notNull().default(5),
  keySources: text("key_sources").notNull(),
  notes: text("notes"),
  svgRegionClass: text("svg_region_class"),
});

export const connectors = sqliteTable("connectors", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  owner: text("owner").notNull(),
  status: text("status").notNull(), // 'live' | 'sandbox' | 'planned'
  governanceStatus: text("governance_status").notNull(), // 'Adapter ready' | 'Sandbox' | 'Approval required' | 'Restricted'
  purpose: text("purpose").notNull(),
  endpoint: text("endpoint").notNull(),
  refresh: text("refresh").notNull(),
  authType: text("auth_type").notNull(),
  documentationUrl: text("documentation_url"),
  contractDetails: text("contract_details").notNull(), // JSON string
});

export const scenarioRuns = sqliteTable("scenario_runs", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  studyId: text("study_id"),
  geographyId: text("geography_id"),
  districtName: text("district_name"),
  interventionId: text("intervention_id"),
  interventionName: text("intervention_name"),
  conservation: integer("conservation").notNull().default(65),
  livelihood: integer("livelihood").notNull().default(70),
  feasibility: integer("feasibility").notNull().default(60),
  water: integer("water").notNull().default(75),
  score: integer("score").notNull(),
  method: text("method").notNull(),
  recommendation: text("recommendation").notNull(),
  impacts: text("impacts").notNull(), // JSON string
  assumptions: text("assumptions").notNull(), // JSON string
  parameters: text("parameters"), // JSON string
  baselineData: text("baseline_data"), // JSON string
  scenarioData: text("scenario_data"), // JSON string
  evidenceSnapshot: text("evidence_snapshot").notNull(),
  createdAt: text("created_at").notNull(),
});

export const dashboardMetrics = sqliteTable("dashboard_metrics", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  delta: text("delta").notNull(),
  label: text("label").notNull(),
  tone: text("tone").notNull(),
  sortOrder: integer("sort_order").notNull(),
});

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("Policy Analyst"), // 'Policy Analyst' | 'Researcher' | 'Administrator'
  createdAt: text("created_at").notNull(),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
});

export const ogdRecords = sqliteTable("ogd_records", {
  id: text("id").primaryKey(),
  source: text("source").notNull().default("Open Government Data Platform India"),
  authority: text("authority").notNull(),
  datasetTitle: text("dataset_title").notNull(),
  catalogId: text("catalog_id").notNull(),
  resourceId: text("resource_id").notNull(),
  sourceUrl: text("source_url").notNull(),
  retrievedAt: text("retrieved_at").notNull(),
  publicationDate: text("publication_date"),
  geography: text("geography").notNull(),
  state: text("state"),
  district: text("district"),
  recordIdentifier: text("record_identifier"),
  checksum: text("checksum").notNull(),
  payload: text("payload").notNull(), // Normalized JSON record string
  isOfficial: integer("is_official").notNull().default(1),
});


