import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  getAdminMetrics,
  getAdminUsers,
  getProductHealth,
  getRecentAlerts,
} from "@/lib/admin-queries";

export const metadata = { title: "Admin — Compass" };
export const dynamic = "force-dynamic";

function fmtTokens(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export default async function AdminPage() {
  const session = await auth();
  const adminEmail = process.env.ADMIN_EMAIL;

  // Guard: só o email admin acessa. Qualquer outro caso → 404 (não revela que existe).
  if (!session?.user?.email || !adminEmail || session.user.email !== adminEmail) {
    notFound();
  }

  const [metrics, users, health, alerts] = await Promise.all([
    getAdminMetrics(),
    getAdminUsers(),
    getProductHealth(),
    getRecentAlerts(20),
  ]);

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-10 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-6xl space-y-10">
        <header>
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
            Compass · Admin
          </p>
          <div className="flex items-center justify-between">
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              Business overview
            </h1>
            <a
              href="/admin/playbook"
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              📋 Playbook de Outreach
            </a>
          </div>
        </header>

        {/* Métricas de negócio */}
        <section>
          <h2 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Revenue & growth
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="MRR" value={`$${metrics.mrr}`} accent sub={`${metrics.proCount} pro subs`} />
            <Stat
              label="Lifetime revenue"
              value={`$${metrics.lifetimeRevenue}`}
              sub={`${metrics.lifetimeCount} lifetime`}
            />
            <Stat
              label="Total users"
              value={String(metrics.totalUsers)}
              sub={`+${metrics.newUsers7d} this week`}
            />
            <Stat
              label="Trial → paid"
              value={`${metrics.trialToPaidPct}%`}
              sub={`${metrics.proCount + metrics.lifetimeCount} paid`}
            />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Trials active" value={String(metrics.trialActive)} />
            <Stat label="Trials expired" value={String(metrics.trialExpired)} />
            <Stat label="Users with data" value={String(metrics.usersWithData)} sub="daemon synced" />
            <Stat label="Active daemons (7d)" value={String(health.activeDaemons7d)} />
          </div>
        </section>

        {/* Saúde do produto */}
        <section>
          <h2 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Product health
          </h2>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="Ingestions total" value={String(health.totalIngestions)} small />
            <Stat label="Ingestions 24h" value={String(health.ingestions24h)} small />
            <Stat
              label="Errors 7d"
              value={String(health.ingestionErrors7d)}
              small
              warn={health.ingestionErrors7d > 0}
            />
            <Stat label="Alerts total" value={String(health.alertsSent)} small />
            <Stat label="Alerts 7d" value={String(health.alerts7d)} small />
            <Stat label="Active daemons" value={String(health.activeDaemons7d)} small />
          </div>
        </section>

        {/* Lista de usuários */}
        <section>
          <h2 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Users ({users.length})
          </h2>
          <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 text-xs uppercase tracking-wider text-zinc-500 dark:border-zinc-800">
                <tr>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3">Last sync</th>
                  <th className="px-4 py-3 text-right">Tokens</th>
                  <th className="px-4 py-3 text-right">PAYG $</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/60">
                    <td className="px-4 py-3 text-zinc-800 dark:text-zinc-200">{u.email}</td>
                    <td className="px-4 py-3">
                      <PlanBadge plan={u.plan} />
                    </td>
                    <td className="px-4 py-3 text-zinc-500">
                      {formatDistanceToNow(u.createdAt, { addSuffix: true })}
                    </td>
                    <td className="px-4 py-3 text-zinc-500">
                      {u.lastSync ? formatDistanceToNow(u.lastSync, { addSuffix: true }) : "never"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-zinc-600 dark:text-zinc-400">
                      {fmtTokens(u.totalTokens)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-zinc-600 dark:text-zinc-400">
                      ${u.costUsd.toFixed(0)}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                      No users yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Alertas recentes */}
        <section>
          <h2 className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Recent alerts
          </h2>
          <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 text-xs uppercase tracking-wider text-zinc-500 dark:border-zinc-800">
                <tr>
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Title</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((a) => (
                  <tr key={a.id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/60">
                    <td className="px-4 py-3 text-zinc-500">
                      {formatDistanceToNow(a.sentAt, { addSuffix: true })}
                    </td>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{a.userEmail}</td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                        {a.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">{a.title}</td>
                  </tr>
                ))}
                {alerts.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                      No alerts sent yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  sub,
  accent = false,
  warn = false,
  small = false,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  warn?: boolean;
  small?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        accent
          ? "border-indigo-200 bg-indigo-50 dark:border-indigo-900 dark:bg-indigo-950/30"
          : warn
          ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
          : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
      }`}
    >
      <p className="text-xs uppercase tracking-wider text-zinc-500">{label}</p>
      <p
        className={`mt-1 font-bold ${small ? "text-xl" : "text-2xl"} ${
          accent
            ? "text-indigo-900 dark:text-indigo-200"
            : warn
            ? "text-red-700 dark:text-red-300"
            : "text-zinc-950 dark:text-zinc-50"
        }`}
      >
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-zinc-500">{sub}</p>}
    </div>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const styles: Record<string, string> = {
    pro: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
    lifetime: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    trial: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
    trial_expired: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  };
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${styles[plan] ?? styles.trial}`}>
      {plan}
    </span>
  );
}
