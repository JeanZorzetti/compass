import { prisma } from "@/lib/prisma";
import { getUserUsage } from "@/lib/usage-queries";
import { sendAlertEmail } from "@/lib/email";

const MS_DAY = 24 * 60 * 60 * 1000;

export type AlertDecision = {
  shouldAlert: boolean;
  type: "approaching_limit" | "limit_hit" | null;
  currentWeekTokens: number;
  baselinePeakTokens: number;
  pctOfPeak: number;
  reason: string;
};

/**
 * Baseline auto-aprendido:
 * - Soma tokens por dia (já temos via getUserUsage agregado por data)
 * - Calcula o pico de janela de 7 dias consecutivos no histórico (excluindo a semana corrente)
 * - Compara uso da semana corrente com esse pico
 */
export async function evaluateUserAlert(userId: string, thresholdPct: number): Promise<AlertDecision> {
  const usage = await getUserUsage(userId);

  // Agrega tokens por dia
  const dailyMap = new Map<string, number>();
  for (const u of usage) {
    dailyMap.set(u.date, (dailyMap.get(u.date) ?? 0) + u.totalTokens);
  }

  const days = Array.from(dailyMap.entries())
    .map(([date, tokens]) => ({ date, tokens, ts: new Date(date).getTime() }))
    .sort((a, b) => a.ts - b.ts);

  if (days.length < 7) {
    return {
      shouldAlert: false,
      type: null,
      currentWeekTokens: 0,
      baselinePeakTokens: 0,
      pctOfPeak: 0,
      reason: "histórico insuficiente (< 7 dias)",
    };
  }

  const now = Date.now();
  const weekAgo = now - 7 * MS_DAY;

  // Uso da semana corrente
  const currentWeekTokens = days
    .filter((d) => d.ts >= weekAgo)
    .reduce((s, d) => s + d.tokens, 0);

  // Pico de janela de 7 dias no histórico anterior (exclui semana corrente)
  const historical = days.filter((d) => d.ts < weekAgo);
  let baselinePeakTokens = 0;
  for (let i = 0; i < historical.length; i++) {
    const windowStart = historical[i].ts;
    const windowEnd = windowStart + 7 * MS_DAY;
    const windowSum = historical
      .filter((d) => d.ts >= windowStart && d.ts < windowEnd)
      .reduce((s, d) => s + d.tokens, 0);
    if (windowSum > baselinePeakTokens) baselinePeakTokens = windowSum;
  }

  if (baselinePeakTokens === 0) {
    return {
      shouldAlert: false,
      type: null,
      currentWeekTokens,
      baselinePeakTokens: 0,
      pctOfPeak: 0,
      reason: "sem baseline histórico ainda",
    };
  }

  const pctOfPeak = Math.round((currentWeekTokens / baselinePeakTokens) * 100);

  if (pctOfPeak >= 100) {
    return {
      shouldAlert: true,
      type: "limit_hit",
      currentWeekTokens,
      baselinePeakTokens,
      pctOfPeak,
      reason: `uso da semana (${pctOfPeak}%) atingiu/passou o pico histórico`,
    };
  }

  if (pctOfPeak >= thresholdPct) {
    return {
      shouldAlert: true,
      type: "approaching_limit",
      currentWeekTokens,
      baselinePeakTokens,
      pctOfPeak,
      reason: `uso da semana (${pctOfPeak}%) passou o threshold de ${thresholdPct}%`,
    };
  }

  return {
    shouldAlert: false,
    type: null,
    currentWeekTokens,
    baselinePeakTokens,
    pctOfPeak,
    reason: `uso ${pctOfPeak}% abaixo do threshold ${thresholdPct}%`,
  };
}

/**
 * Verifica se já mandou alerta desse tipo nos últimos 7 dias (anti-spam).
 */
async function alreadyAlertedThisWeek(userId: string, type: string): Promise<boolean> {
  const weekAgo = new Date(Date.now() - 7 * MS_DAY);
  const recent = await prisma.alert.findFirst({
    where: { userId, type, sentAt: { gte: weekAgo } },
    select: { id: true },
  });
  return Boolean(recent);
}

/**
 * Processa alertas pra todos os users elegíveis. Retorna resumo.
 */
export async function processAllAlerts(): Promise<{
  evaluated: number;
  alertsSent: number;
  details: Array<{ email: string; type: string; pctOfPeak: number }>;
}> {
  const users = await prisma.user.findMany({
    where: {
      alertEmail: true,
      plan: { in: ["trial", "pro", "lifetime"] },
    },
    select: { id: true, email: true, thresholdPct: true },
  });

  let alertsSent = 0;
  const details: Array<{ email: string; type: string; pctOfPeak: number }> = [];

  for (const user of users) {
    const decision = await evaluateUserAlert(user.id, user.thresholdPct);
    if (!decision.shouldAlert || !decision.type) continue;

    if (await alreadyAlertedThisWeek(user.id, decision.type)) continue;

    const title =
      decision.type === "limit_hit"
        ? "You've hit your usual usage ceiling"
        : `You're at ${decision.pctOfPeak}% of your usual weekly usage`;

    await sendAlertEmail(user.email, title, decision);

    await prisma.alert.create({
      data: {
        userId: user.id,
        type: decision.type,
        title,
        message: decision.reason,
        payload: {
          currentWeekTokens: decision.currentWeekTokens,
          baselinePeakTokens: decision.baselinePeakTokens,
          pctOfPeak: decision.pctOfPeak,
        },
      },
    });

    alertsSent++;
    details.push({ email: user.email, type: decision.type, pctOfPeak: decision.pctOfPeak });
  }

  return { evaluated: users.length, alertsSent, details };
}
