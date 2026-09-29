# NIRNAYA — Resources, Documentation, Datasets & Experiments

This directory houses all non-runtime assets, including architectural specifications, data governance documentation, sample GIS XML capabilities, test images, and exploratory test scripts.

## Directory Structure

```text
resources/
├── docs/                     # Technical specifications and guides
│   ├── ARCHITECTURE.md       # High-level architecture, data flows, and diagrams
│   ├── API_SPECIFICATION.md  # Complete REST API reference and request/response payloads
│   └── DATA_GOVERNANCE.md    # Inter-ministerial data governance and compliance tiers
├── datasets/                 # Reference datasets and sample responses
│   ├── bhuvan-vec1-caps.xml  # ISRO Bhuvan WMS Capabilities XML (8.1 MB)
│   ├── bhuvan-html-samples/  # Raw HTML templates for Bhuvan boundary queries
│   └── test-images/          # LULC spatial layer verification test images
└── experiments/              # Research exploration and automated verification tools
    ├── verification/         # 11 automated verification test suites (Bhuvan, Scenarios, Auth, etc.)
    └── exploration/          # 30+ experimental scripts for testing external endpoints and data parsing
```

## Running Verification Scripts
```bash
# Verify Bhuvan WMS Geo connector
pnpm tsx resources/experiments/verification/verify-bhuvan.ts

# Verify scenario scoring algorithm
pnpm tsx resources/experiments/verification/verify-scenarios.ts

# Verify authentication flow
pnpm tsx resources/experiments/verification/verify-auth.ts
```
