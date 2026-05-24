import { prisma } from "@/lib/prisma";

export type UsageRow = {
  date: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreateTokens: number;
  totalTokens: number;
  costUsd: number;
};

export type ModelTotal = {
  model: string;
  totalTokens: number;
  costUsd: number;
};

export type DailyTotal = {
  date: string;
  totalTokens: number;
  costUsd: number;
  byModel: Record<string, number>;
};

export type UserKpis = {
  totalTokens: number;
  totalCostUsd: number;
  modelCount: number;
  topModel: string | null;
  lastUpdated: Date | null;
  daysCovered: number;
};

function bigIntToNumber(v: bigint | number): number {
  return typeof v === "bigint" ? Number(v) : v;
}

export async function getUserUsage(userId: string): Promise<UsageRow[]> {
  const rows = await prisma.usage.findMany({
    where: { userId },
    orderBy: [{ date: "asc" }, { model: "asc" }],
  });

  return rows.map((r) => {
    const input = bigIntToNumber(r.inputTokens);
    const output = bigIntToNumber(r.outputTokens);
    const cacheR = bigIntToNumber(r.cacheReadTokens);
    const cacheC = bigIntToNumber(r.cacheCreateTokens);
    return {
      date: r.date.toISOString().split("T")[0],
      model: r.model,
      inputTokens: input,
      outputTokens: output,
      cacheReadTokens: cacheR,
      cacheCreateTokens: cacheC,
      totalTokens: input + output + cacheR + cacheC,
      costUsd: Number(r.estimatedCostUsd),
    };
  });
}

export function aggregateByModel(rows: UsageRow[]): ModelTotal[] {
  const map = new Map<string, ModelTotal>();
  for (const r of rows) {
    const existing = map.get(r.model);
    if (existing) {
      existing.totalTokens += r.totalTokens;
      existing.costUsd += r.costUsd;
    } else {
      map.set(r.model, {
        model: r.model,
        totalTokens: r.totalTokens,
        costUsd: r.costUsd,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.costUsd - a.costUsd);
}

export function aggregateByDay(rows: UsageRow[]): DailyTotal[] {
  const map = new Map<string, DailyTotal>();
  for (const r of rows) {
    const existing = map.get(r.date);
    if (existing) {
      existing.totalTokens += r.totalTokens;
      existing.costUsd += r.costUsd;
      existing.byModel[r.model] = (existing.byModel[r.model] ?? 0) + r.totalTokens;
    } else {
      map.set(r.date, {
        date: r.date,
        totalTokens: r.totalTokens,
        costUsd: r.costUsd,
        byModel: { [r.model]: r.totalTokens },
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export async function getUserKpis(userId: string): Promise<UserKpis> {
  const rows = await getUserUsage(userId);
  if (rows.length === 0) {
    return {
      totalTokens: 0,
      totalCostUsd: 0,
      modelCount: 0,
      topModel: null,
      lastUpdated: null,
      daysCovered: 0,
    };
  }

  const byModel = aggregateByModel(rows);
  const dates = new Set(rows.map((r) => r.date));

  const lastIngestion = await prisma.ingestionLog.findFirst({
    where: { userId, status: "ok" },
    orderBy: { receivedAt: "desc" },
    select: { receivedAt: true },
  });

  return {
    totalTokens: rows.reduce((s, r) => s + r.totalTokens, 0),
    totalCostUsd: rows.reduce((s, r) => s + r.costUsd, 0),
    modelCount: byModel.length,
    topModel: byModel[0]?.model ?? null,
    lastUpdated: lastIngestion?.receivedAt ?? null,
    daysCovered: dates.size,
  };
}

export async function getRecentIngestions(userId: string, limit = 10) {
  return prisma.ingestionLog.findMany({
    where: { userId },
    orderBy: { receivedAt: "desc" },
    take: limit,
    select: {
      id: true,
      daemonVersion: true,
      payloadSize: true,
      status: true,
      error: true,
      receivedAt: true,
    },
  });
}
