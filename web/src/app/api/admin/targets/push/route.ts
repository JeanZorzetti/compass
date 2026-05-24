import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// Recebe alvos do fresh_outreach.py local (PC com IP residencial busca o Reddit
// sem tomar 403, e empurra pra cá). Protegido pelo CRON_SECRET (já existe).
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  const secret = process.env.CRON_SECRET;
  if (!secret || token !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const targets = body?.targets;
  if (!Array.isArray(targets)) {
    return NextResponse.json({ error: "targets deve ser array" }, { status: 400 });
  }

  let upserted = 0;
  for (const t of targets) {
    if (!t?.id || !t?.url) continue;
    await prisma.outreachTarget.upsert({
      where: { id: String(t.id) },
      update: {
        score: Number(t.score ?? 0),
        comments: Number(t.comments ?? 0),
        ageDays: Number(t.ageDays ?? 0),
        title: String(t.title ?? ""),
        bodyText: String(t.body ?? ""),
      },
      create: {
        id: String(t.id),
        sub: String(t.sub ?? ""),
        title: String(t.title ?? ""),
        bodyText: String(t.body ?? ""),
        url: String(t.url),
        score: Number(t.score ?? 0),
        comments: Number(t.comments ?? 0),
        ageDays: Number(t.ageDays ?? 0),
      },
    });
    upserted++;
  }

  return NextResponse.json({ ok: true, upserted });
}
