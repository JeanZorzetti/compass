import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const ModelTotalsSchema = z.object({
  input_tokens: z.number().int().nonnegative(),
  output_tokens: z.number().int().nonnegative(),
  cache_read_tokens: z.number().int().nonnegative(),
  cache_create_tokens: z.number().int().nonnegative(),
  web_search_requests: z.number().int().nonnegative().optional().default(0),
  cost_usd_estimated: z.number().nonnegative(),
});

const PayloadSchema = z.object({
  daemon_version: z.string().optional(),
  taken_at: z.string().datetime(),
  model_totals: z.record(z.string(), ModelTotalsSchema),
  daily_messages: z.record(z.string(), z.number().int().nonnegative()).optional(),
  daily_sessions: z.record(z.string(), z.number().int().nonnegative()).optional(),
  daily_tool_calls: z.record(z.string(), z.number().int().nonnegative()).optional(),
  daily_tokens_by_model: z
    .record(z.string(), z.record(z.string(), z.number().int().nonnegative()))
    .optional(),
});

export async function POST(req: NextRequest) {
  // Auth: Bearer COMPASS_TOKEN
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: "missing bearer token" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { apiToken: token } });
  if (!user) {
    return NextResponse.json({ error: "invalid token" }, { status: 401 });
  }

  // Body
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    await prisma.ingestionLog.create({
      data: { userId: user.id, payloadSize: 0, status: "error", error: "invalid json" },
    });
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const parsed = PayloadSchema.safeParse(json);
  if (!parsed.success) {
    await prisma.ingestionLog.create({
      data: {
        userId: user.id,
        payloadSize: JSON.stringify(json).length,
        status: "error",
        error: JSON.stringify(parsed.error.issues).slice(0, 1000),
      },
    });
    return NextResponse.json({ error: "schema validation failed", issues: parsed.error.issues }, { status: 422 });
  }

  const data = parsed.data;
  const provider = "claude_code"; // v1 — único provider
  const today = new Date(data.taken_at).toISOString().split("T")[0];

  // Upsert ACUMULADO por modelo (date = última data conhecida; v1 simples)
  // Em v2 vamos splitar por dia usando daily_tokens_by_model.
  const writes = Object.entries(data.model_totals).map(([model, totals]) => {
    return prisma.usage.upsert({
      where: {
        userId_provider_model_date: {
          userId: user.id,
          provider,
          model,
          date: new Date(today),
        },
      },
      update: {
        inputTokens: BigInt(totals.input_tokens),
        outputTokens: BigInt(totals.output_tokens),
        cacheReadTokens: BigInt(totals.cache_read_tokens),
        cacheCreateTokens: BigInt(totals.cache_create_tokens),
        estimatedCostUsd: totals.cost_usd_estimated,
      },
      create: {
        userId: user.id,
        provider,
        model,
        date: new Date(today),
        inputTokens: BigInt(totals.input_tokens),
        outputTokens: BigInt(totals.output_tokens),
        cacheReadTokens: BigInt(totals.cache_read_tokens),
        cacheCreateTokens: BigInt(totals.cache_create_tokens),
        estimatedCostUsd: totals.cost_usd_estimated,
      },
    });
  });

  await prisma.$transaction(writes);

  await prisma.ingestionLog.create({
    data: {
      userId: user.id,
      daemonVersion: data.daemon_version,
      payloadSize: JSON.stringify(json).length,
      status: "ok",
    },
  });

  return NextResponse.json({
    ok: true,
    models_upserted: writes.length,
    user_id: user.id,
  });
}

export async function GET() {
  return NextResponse.json({
    service: "compass",
    endpoint: "/api/usage",
    method: "POST",
    auth: "Bearer <COMPASS_TOKEN>",
  });
}
