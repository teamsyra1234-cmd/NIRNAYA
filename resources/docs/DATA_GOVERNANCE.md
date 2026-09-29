# Data Governance & Inter-Ministerial Policy Framework

## Overview
NIRNAYA adheres strictly to the Open Government Data (OGD) policy and national geospatial guidelines prescribed by the Department of Science & Technology (DST) and Ministry of Electronics and Information Technology (MeitY).

## Tiered Access Matrix

| Tier | Integration Tier | Regulatory Authority | Integration Mechanism | Status in Portal |
|------|------------------|----------------------|-----------------------|------------------|
| **1** | Open Government Data (OGD) | NIC / MeitY | Public REST API | Live Demonstration Connector |
| **1** | ISRO Bhuvan Geo-Portal | NRSC / ISRO | WMS / GetFeatureInfo | Live WMS Vector Adapter |
| **1** | OpenAlex Research Graph | OurResearch | Public Scholarly API | Active |
| **2** | India-WRIS Hydrology | Ministry of Jal Shakti | Open Geo-Data API | Sandbox Mock |
| **3** | DILRMP Land Records & RoR | Dept of Land Resources (DoLR) | State Secured Gateway | Restricted (MOU Required) |
| **3** | ULPIN & Bhu-Aadhaar | DoLR / NIC | State Land Registry API | Restricted (API Token Required) |
| **3** | TiNAI / High Court Land Cases | Judicial Data Grid | Legal Record API | Restricted (Judicial Agreement) |

## Data Provenance & Cryptographic Integrity
1. Every evidence record ingested into NIRNAYA is assigned a SHA-256 checksum at the moment of intake.
2. The exact publisher, ministry authority, date of gazette or publication, and direct URL are preserved immutably.
3. No AI generative modifications are performed on official government statistics; the scenario engine applies transparent, deterministic multi-criteria weights that can be inspected and cross-examined in legislative briefings.
