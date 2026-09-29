# REST API Specification — NIRNAYA v1

All API endpoints are hosted under `/api/v1/` and `/api/auth/`.

## Authentication Endpoints

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| `POST` | `/api/auth/signup` | Register new policy analyst user | `{ fullName, email, password }` | `{ success: true, user }` |
| `POST` | `/api/auth/login` | Authenticate and issue HTTP-only cookie | `{ email, password }` | `{ success: true, user }` |
| `GET` | `/api/auth/session` | Inspect current session & role | None | `{ authenticated: boolean, user? }` |
| `POST` | `/api/auth/logout` | Revoke session and clear cookies | None | `{ success: true }` |

---

## Intelligence & Data Endpoints

### 1. Dashboard Metrics
- **Route:** `GET /api/v1/dashboard`
- **Description:** Aggregates live system KPIs, total pilot evidence records, verification percentages, active studies, and institutional breakdowns.
- **Response Format:**
```json
{
  "metrics": [
    { "key": "evidence_assets", "label": "Pilot evidence records", "value": "12", "tone": "blue" },
    { "key": "active_studies", "label": "Pilot policy studies", "value": "5", "tone": "saffron" }
  ],
  "studies": [...],
  "yearlyEvidence": [...],
  "quality": { "verified": 85, "breakdown": [...] }
}
```

### 2. Evidence Explorer
- **Route:** `GET /api/v1/evidence`
- **Query Parameters:**
  - `q`: Search string (e.g. `water`, `chennai`)
  - `tag`: Filter by thematic tag (e.g. `hydrology`, `coastal`, `disputes`)
  - `verified`: `1` or `0`
- **Description:** Returns peer-reviewed studies, government gazette notifications, and spatial ground-truth audits with full provenance data.

### 3. Geospatial District Insights
- **Route:** `GET /api/v1/geo/districts`
- **Query Parameters:**
  - `layer`: Thematic layer name (`Composite risk`, `Water stress`, `Built-up expansion`, `Livelihood sensitivity`)
- **Description:** Spatial multi-criteria indicators across the 6 pilot districts (Chennai, Kancheepuram, Tiruvallur, Raichur, Kalahandi, Pune).

### 4. Policy Scenario Simulation
- **Route:** `POST /api/v1/scenarios/run`
- **Request Body:**
```json
{
  "districtId": "kancheepuram",
  "interventionId": "peri_urban_protection",
  "conservation": 65,
  "livelihood": 70,
  "feasibility": 60,
  "water": 75
}
```
- **Description:** Transparent multi-criteria scoring algorithm assessing intervention feasibility and risk trade-offs without opaque black-box AI claims.

### 5. Decision Brief Generator
- **Route:** `POST /api/v1/scenarios/brief`
- **Request Body:** Scenario run result object
- **Description:** Generates an official, auditable Markdown/HTML Decision Brief formatted for inter-departmental secretaries and ministers.

### 6. Connector Registry & Live Adapters
- **Route:** `GET /api/v1/connectors`
- **Description:** Status of all 6 institutional connectors:
  1. Open Government Data (OGD) Platform India
  2. ISRO Bhuvan Geo-Portal (NRSC)
  3. National Water Resources Information System (India-WRIS)
  4. Digital India Land Records Modernization Programme (DILRMP)
  5. OpenAlex Global Research Citation Graph
  6. TiNAI (Judicial land dispute records)
