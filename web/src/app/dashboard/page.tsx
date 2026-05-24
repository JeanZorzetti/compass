import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { DailyTokensChart } from "@/components/charts/daily-tokens-chart";
import { ModelCostChart } from "@/components/charts/model-cost-chart";
import {
  aggregateByDay,
  aggregateByModel,
  getRecentIngestions,
  getUserKpis,
  getUserUsage,
} from "@/lib/usage-queries";

export const metadata = {
  title: "Dashboard — Compass",
};

function formatTokens(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function formatUSD(n: number): string {
  return `$${n.toFixed(2)}`;
}

function shortModelName(name: string): string {
  return name.replace("claude-", "").replace(/-2\d{7}$/, "");
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      email: true,
      name: true,
      plan: true,
      trialEndsAt: true,
      apiToken: true,
      thresholdPct: true,
    },
  });
  if (!user) redirect("/login");

  const [usage, kpis, ingestions] = await Promise.all([
    getUserUsage(session.user.id),
    getUserKpis(session.user.id),
    getRecentIngestions(session.user.id, 5),
  ]);

  const byModel = aggregateByModel(usage);
  const byDay = aggregateByDay(usage);
  const models = byModel.map((m) => m.model);
  const hasData = usage.length > 0;

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-12 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
              Compass · Dashboard
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
              {user.name ?? user.email}
            </h1>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button className="rounded-md border border-zinc-300 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900">
              Sign out
            </button>
          </form>
        </header>

        {/* KPIs */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi
            title="Tokens (all time)"
            value={formatTokens(kpis.totalTokens)}
            sub={`${kpis.daysCovered} days tracked`}
          />
          <Kpi
            title="PAYG cost equivalent"
            value={formatUSD(kpis.totalCostUsd)}
            sub="What you'd pay on API"
            accent
          />
          <Kpi
            title="Most-used model"
            value={kpis.topModel ? shortModelName(kpis.topModel) : "—"}
            sub={`${kpis.modelCount} model${kpis.modelCount === 1 ? "" : "s"}`}
          />
          <Kpi
            title="Last sync"
            value={
              kpis.lastUpdated
                ? formatDistanceToNow(kpis.lastUpdated, { addSuffix: true })
                : "never"
            }
            sub={user.plan === "trial" && user.trialEndsAt
              ? `Trial ends ${formatDistanceToNow(user.trialEndsAt, { addSuffix: true })}`
              : `Plan: ${user.plan}`}
          />
        </section>

        {(user.plan === "trial" || user.plan === "trial_expired") && (
          <TrialBanner plan={user.plan} trialEndsAt={user.trialEndsAt} />
        )}

        {!hasData && <EmptyState apiToken={user.apiToken} />}

        {hasData && (
          <>
            {/* Daily tokens */}
            <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Tokens per day, by model
                </h2>
                <p className="text-xs text-zinc-500">
                  Includes input, output, cache read and cache write tokens.
                </p>
              </div>
              <DailyTokensChart data={byDay} models={models} />
            </section>

            {/* Cost per model */}
            <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Pay-as-you-go cost equivalent, by model
                </h2>
                <p className="text-xs text-zinc-500">
                  What your usage would cost on Anthropic API pricing. You're paying a flat
                  plan instead.
                </p>
              </div>
              <ModelCostChart data={byModel} />
            </section>
          </>
        )}

        {/* Daemon token */}
        <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Your daemon credentials
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Export these in your shell, then run <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-950">compass --watch</code> to stream usage.
          </p>
          <pre className="mt-3 overflow-x-auto rounded bg-zinc-100 p-3 text-xs text-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
            <code>{`export COMPASS_TOKEN=${user.apiToken}
export COMPASS_API=https://compass.polarisia.com.br`}</code>
          </pre>
        </section>

        {/* Recent ingestions */}
        {ingestions.length > 0 && (
          <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Recent daemon sync
            </h2>
            <table className="mt-3 w-full text-left text-sm">
              <thead className="text-xs text-zinc-500">
                <tr>
                  <th className="py-2">When</th>
                  <th className="py-2">Daemon version</th>
                  <th className="py-2">Payload</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {ingestions.map((row) => (
                  <tr key={row.id} className="border-t border-zinc-100 dark:border-zinc-800">
                    <td className="py-2 text-zinc-700 dark:text-zinc-300">
                      {formatDistanceToNow(row.receivedAt, { addSuffix: true })}
                    </td>
                    <td className="py-2 text-zinc-500 font-mono text-xs">
                      {row.daemonVersion ?? "—"}
                    </td>
                    <td className="py-2 text-zinc-500 font-mono text-xs">
                      {(row.payloadSize / 1024).toFixed(1)} KB
                    </td>
                    <td className="py-2">
                      <span
                        className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${
                          row.status === "ok"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </main>
  );
}

function Kpi({
  title,
  value,
  sub,
  accent = false,
}: {
  title: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        accent
          ? "border-indigo-200 bg-indigo-50 dark:border-indigo-900 dark:bg-indigo-950/30"
          : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
      }`}
    >
      <p className="text-xs uppercase tracking-wider text-zinc-500">{title}</p>
      <p
        className={`mt-1 text-2xl font-bold ${
          accent
            ? "text-indigo-900 dark:text-indigo-200"
            : "text-zinc-950 dark:text-zinc-50"
        }`}
      >
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-zinc-500">{sub}</p>}
    </div>
  );
}

function TrialBanner({
  plan,
  trialEndsAt,
}: {
  plan: string;
  trialEndsAt: Date | null;
}) {
  const expired = plan === "trial_expired" || (trialEndsAt && trialEndsAt < new Date());
  return (
    <div
      className={`flex items-center justify-between rounded-lg border p-4 ${
        expired
          ? "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
          : "border-indigo-200 bg-indigo-50 dark:border-indigo-900 dark:bg-indigo-950/30"
      }`}
    >
      <div>
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {expired ? "Your trial has ended" : "You're on a free trial"}
        </p>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          {expired
            ? "Upgrade to keep syncing your usage data."
            : trialEndsAt
            ? `Ends ${formatDistanceToNow(trialEndsAt, { addSuffix: true })}. Get lifetime for $49 (limited).`
            : "Upgrade anytime to lock in pricing."}
        </p>
      </div>
      <Link
        href="/pricing"
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
      >
        See plans
      </Link>
    </div>
  );
}

function EmptyState({ apiToken }: { apiToken: string }) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-12 text-center dark:border-zinc-700 dark:bg-zinc-900">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        No usage data yet
      </h2>
      <p className="mt-2 text-sm text-zinc-500">
        Install the Compass daemon, set your token, and run it once to populate this dashboard.
      </p>

      <div className="mx-auto mt-6 max-w-xl space-y-4 text-left">
        <div>
          <p className="mb-1 text-xs font-medium text-zinc-500">macOS / Linux</p>
          <pre className="overflow-x-auto rounded bg-zinc-100 p-4 text-xs text-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
            <code>{`curl -L https://compass.polarisia.com.br/dl/compass | bash

export COMPASS_TOKEN=${apiToken}
export COMPASS_API=https://compass.polarisia.com.br

compass --watch`}</code>
          </pre>
        </div>

        <div>
          <p className="mb-1 text-xs font-medium text-zinc-500">Windows (PowerShell)</p>
          <pre className="overflow-x-auto rounded bg-zinc-100 p-4 text-xs text-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
            <code>{`irm https://compass.polarisia.com.br/dl/compass.ps1 | iex

$env:COMPASS_TOKEN = "${apiToken}"
$env:COMPASS_API = "https://compass.polarisia.com.br"

compass --watch`}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
