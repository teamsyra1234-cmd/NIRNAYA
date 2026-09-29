import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { connectors, ogdRecords } from "@/db/schema";
import { BHUVAN_CONFIG } from "@/lib/adapters/bhuvan";

export async function GET() {
  try {
    const db = getDb();
    const rows = await db.select().from(connectors).all();

    const ogdRecordsRows = await db.select().from(ogdRecords).all();
    const ogdRecordCount = ogdRecordsRows.length;

    const items = rows.map((c) => {
      let contract: any = null;
      try {
        contract = JSON.parse(c.contractDetails);
      } catch {
        contract = { details: c.contractDetails };
      }
      let status = c.status;
      let governanceStatus = c.governanceStatus;

      if (c.id === "ogd") {
        if (ogdRecordCount > 0) {
          status = "live";
          governanceStatus = "LIVE / OFFICIAL";
        } else {
          status = "approval-required";
          governanceStatus = "API KEY REQUIRED";
        }
      } else if (c.id === "bhuvan") {
        status = "live";
        governanceStatus = "LIVE / OFFICIAL";
        contract = {
          source: "Bhuvan / NRSC",
          dataset: "LULC",
          status: "LIVE / OFFICIAL",
          service: "WMS",
          authority: "National Remote Sensing Centre (NRSC), ISRO, Government of India",
          wmsEndpoint: BHUVAN_CONFIG.wmsEndpoint,
          verifiedLayers: [
            {
              name: "sisdpv2:TN_Kancheepuram_lulc_v2",
              title: "Kancheepuram District LULC (SISDP V2 1:10,000)",
              description: "High-resolution Space-based Information Support for Decentralised Planning",
              scope: "Active when Kancheepuram is selected",
            },
            {
              name: "sisdpv2:TN_Thiruvallur_lulc_v2",
              title: "Thiruvallur District LULC (SISDP V2 1:10,000)",
              description: "High-resolution Space-based Information Support for Decentralised Planning",
              scope: "Active when Thiruvallur is selected",
            },
            {
              name: "sisdpv2:TN_Chennai_lulc_v2",
              title: "Chennai District LULC (SISDP V2 1:10,000)",
              description: "High-resolution Space-based Information Support for Decentralised Planning",
              scope: "Active when Chennai is selected",
            },
          ],
          attribution: "Source: Bhuvan / NRSC / ISRO, Government of India",
          consumptionMode: "Direct client-side OGC WMS rendering (no local caching or storage of satellite imagery)",
        };
      }

      return {
        id: c.id,
        name: c.id === "bhuvan" ? "Bhuvan / NRSC Geospatial Portal" : c.name,
        owner: c.id === "bhuvan" ? "Bhuvan / NRSC / ISRO, Government of India" : c.owner,
        status,
        governanceStatus,
        purpose:
          c.id === "bhuvan"
            ? "Official satellite Land Use / Land Cover (LULC) layers consumed live via OGC WMS directly in the Geospatial Insights map."
            : c.purpose,
        endpoint: c.endpoint,
        refresh: c.id === "bhuvan" ? "Live OGC WMS Stream" : c.refresh,
        authType: c.id === "bhuvan" ? "Open OGC WMS (No auth required)" : c.authType,
        documentationUrl: c.documentationUrl,
        recordsCount: c.id === "ogd" ? ogdRecordCount : undefined,
        contract,
      };
    });

    return NextResponse.json({
      items,
      total: items.length,
      generatedAt: new Date().toISOString(),
      governanceNotice: "Restricted government integrations are labeled as 'Approval required' or 'Sandbox' until official department credentials and data-sharing agreements are provided.",
    });
  } catch (error) {
    console.error("Connectors API error:", error);
    return NextResponse.json(
      { error: "Failed to load connectors from database." },
      { status: 500 }
    );
  }
}
