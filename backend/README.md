# NIRNAYA — Backend Services & Data Layer

This folder contains all server-side logic, database models, business logic engines, external adapters, and migration utilities.

## Directory Structure

```text
backend/
├── api/                  # REST route handlers and controllers
│   ├── auth/             # Login, signup, logout, session verification
│   └── v1/               # Core domain APIs
│       ├── adapters/     # Bhuvan and OGD dynamic query endpoints
│       ├── connectors/   # Institutional integration registry & contracts
│       ├── dashboard/    # KPI metrics, studies, and trend analytics
│       ├── evidence/     # Curated evidence repository search & tags
│       ├── geo/          # Pilot district risk scores and map layers
│       ├── ogd/          # Open Government Data India search proxy
│       └── scenarios/    # Policy scenario preflight and decision briefs
├── db/                   # Drizzle ORM Database Engine
│   ├── index.ts          # Client instantiation and schema initialization
│   ├── schema.ts         # SQLite / LibSQL table schemas
│   └── migrations/       # SQL migration versions
├── services/             # Core business logic and external integrations
│   ├── adapters/         # Bhuvan (ISRO) and OGD (data.gov.in) connectors
│   ├── auth.ts           # PBKDF2 password hashing & token validation
│   ├── scenarios.ts      # Multi-criteria policy weighting algorithm
│   └── nirnaya-data.ts   # Seed dataset and baseline evidence
└── scripts/              # Database maintenance & audit scripts
    ├── seed.ts           # Initializes and populates nirnaya.db
    ├── init-ogd-db.ts    # Creates OGD records cache table
    └── audit-db.ts       # Validates data integrity & relationships
```

## Running Database Scripts
```bash
# Populate/reset the SQLite database with seed records
pnpm db:seed

# Audit database records and verify integrity
pnpm db:audit
```
