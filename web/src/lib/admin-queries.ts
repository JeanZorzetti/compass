import { prisma } from "@/lib/prisma";

const PRICE_PRO_MONTHLY = 19;
const PRICE_LIFETIME = 49;

export type AdminMetrics = {
  totalUsers: number;
  trialActive: number;
  trialExpired: number;
  proCount: number;
  lifetimeCount: number;
  mrr: number;
  lifetimeRevenue: number;
  trialToPaidPct: number;
  usersWithData: number;
  newUsers7d: number;
};

export async function getAdminMetrics(): Promise<AdminMetrics> {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    trialActive,
    trialExpired,
    proCount,
    lifetimeCount,
    usersWithData,
    newUsers7d,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { plan: "trial", trialEndsAt: { gte: now } } }),
    prisma.user.count({
      where: {
        OR: [
          { plan: "trial_expired" },
          { plan: "trial", trialEndsAt: { lt: now } },
        ],
      },
    }),
    prisma.user.count({ where: { plan: "pro" } }),
    prisma.user.count({ where: { plan: "lifetime" } }),
    prisma.usage.findMany({ select: { userId: true }, distinct: ["userId"] }).then((r) => r.length),
    prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
  ]);

  const paid = proCount + lifetimeCount;
  const trialToPaidPct = totalUsers > 0 ? Math.round((paid / totalUsers) * 100) : 0;

  return {
    totalUsers,
    trialActive,
    trialExpired,
    proCount,
    lifetimeCount,
    mrr: proCount * PRICE_PRO_MONTHLY,
    lifetimeRevenue: lifetimeCount * PRICE_LIFETIME,
    trialToPaidPct,
    usersWithData,
    newUsers7d,
  };
}

export type AdminUserRow = {
  id: string;
  email: string;
  name: string | null;
  plan: string;
  trialEndsAt: Date | null;
  createdAt: Date;
  lastSync: Date | null;
  totalTokens: number;
  costUsd: number;
};

export async function getAdminUsers(): Promise<AdminUserRow[]> {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      plan: true,
      trialEndsAt: true,
      createdAt: true,
    },
  });

  // Agrega tokens + custo + último sync por user
  const usageAgg = await prisma.usage.groupBy({
    by: ["userId"],
    _sum: {
      inputTokens: true,
      outputTokens: true,
      cacheReadTokens: true,
      cacheCreateTokens: true,
      estimatedCostUsd: true,
    },
  });
  const usageMap = new Map(usageAgg.map((u) => [u.userId, u]));

  const lastSyncAgg = await prisma.ingestionLog.groupBy({
    by: ["userId"],
    where: { status: "ok" },
    _max: { receivedAt: true },
  });
  const syncMap = new Map(lastSyncAgg.map((s) => [s.userId, s._max.receivedAt]));

  return users.map((u) => {
    const agg = usageMap.get(u.id);
    const tokens = agg
      ? Number(agg._sum.inputTokens ?? 0) +
        Number(agg._sum.outputTokens ?? 0) +
        Number(agg._sum.cacheReadTokens ?? 0) +
        Number(agg._sum.cacheCreateTokens ?? 0)
      : 0;
    return {
      ...u,
      lastSync: syncMap.get(u.id) ?? null,
      totalTokens: tokens,
      costUsd: agg ? Number(agg._sum.estimatedCostUsd ?? 0) : 0,
    };
  });
}

export type ProductHealth = {
  totalIngestions: number;
  ingestions24h: number;
  ingestionErrors7d: number;
  activeDaemons7d: number;
  alertsSent: number;
  alerts7d: number;
};

export async function getProductHealth(): Promise<ProductHealth> {
  const now = new Date();
  const day = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const week = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalIngestions,
    ingestions24h,
    ingestionErrors7d,
    activeDaemons7d,
    alertsSent,
    alerts7d,
  ] = await Promise.all([
    prisma.ingestionLog.count(),
    prisma.ingestionLog.count({ where: { receivedAt: { gte: day } } }),
    prisma.ingestionLog.count({ where: { status: "error", receivedAt: { gte: week } } }),
    prisma.ingestionLog
      .findMany({
        where: { status: "ok", receivedAt: { gte: week } },
        select: { userId: true },
        distinct: ["userId"],
      })
      .then((r) => r.length),
    prisma.alert.count(),
    prisma.alert.count({ where: { sentAt: { gte: week } } }),
  ]);

  return {
    totalIngestions,
    ingestions24h,
    ingestionErrors7d,
    activeDaemons7d,
    alertsSent,
    alerts7d,
  };
}

export type RecentAlert = {
  id: string;
  type: string;
  title: string;
  sentAt: Date;
  userEmail: string;
};

export async function getRecentAlerts(limit = 20): Promise<RecentAlert[]> {
  const alerts = await prisma.alert.findMany({
    orderBy: { sentAt: "desc" },
    take: limit,
    include: { user: { select: { email: true } } },
  });
  return alerts.map((a) => ({
    id: a.id,
    type: a.type,
    title: a.title,
    sentAt: a.sentAt,
    userEmail: a.user.email,
  }));
}
