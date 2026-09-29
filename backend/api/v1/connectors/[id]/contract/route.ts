import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { connectors } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const db = getDb();
    const rows = await db.select().from(connectors).where(eq(connectors.id, id)).all();

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: `Connector with ID '${id}' not found.` }, { status: 404 });
    }

    const c = rows[0];
    let parsedContract = {};
    try {
      parsedContract = JSON.parse(c.contractDetails);
    } catch {
      parsedContract = { raw: c.contractDetails };
    }

    return NextResponse.json({
      connectorId: c.id,
      name: c.name,
      owner: c.owner,
      governanceStatus: c.governanceStatus,
      authType: c.authType,
      endpoint: c.endpoint,
      refresh: c.refresh,
      documentationUrl: c.documentationUrl,
      contract: parsedContract,
      verifiedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Connector contract API error:", error);
    return NextResponse.json({ error: "Failed to retrieve connector contract." }, { status: 500 });
  }
}
