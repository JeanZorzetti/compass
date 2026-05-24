import { NextRequest, NextResponse } from "next/server";
import { processAllAlerts } from "@/lib/alerts";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  // Proteção: header Authorization: Bearer <CRON_SECRET>
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  if (token !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await processAllAlerts();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron/alerts] failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}
