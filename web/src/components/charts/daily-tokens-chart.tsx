"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailyTotal } from "@/lib/usage-queries";

interface Props {
  data: DailyTotal[];
  models: string[];
}

const MODEL_COLORS = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#f59e0b", // amber
  "#10b981", // emerald
  "#06b6d4", // cyan
];

function shortModelName(name: string): string {
  return name
    .replace("claude-", "")
    .replace(/-2\d{7}$/, "")
    .replace("-20251101", "");
}

function formatTokens(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export function DailyTokensChart({ data, models }: Props) {
  const chartData = data.map((d) => ({
    date: d.date.slice(5),
    ...models.reduce<Record<string, number>>((acc, m) => {
      acc[shortModelName(m)] = d.byModel[m] ?? 0;
      return acc;
    }, {}),
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={chartData}>
        <defs>
          {models.map((m, i) => {
            const id = `gradient-${i}`;
            return (
              <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={MODEL_COLORS[i % MODEL_COLORS.length]}
                  stopOpacity={0.4}
                />
                <stop
                  offset="95%"
                  stopColor={MODEL_COLORS[i % MODEL_COLORS.length]}
                  stopOpacity={0.05}
                />
              </linearGradient>
            );
          })}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="date" stroke="#737373" fontSize={11} />
        <YAxis
          tickFormatter={formatTokens}
          stroke="#737373"
          fontSize={11}
        />
        <Tooltip
          formatter={(value) => formatTokens(Number(value))}
          contentStyle={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 6 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {models.map((m, i) => (
          <Area
            key={m}
            type="monotone"
            dataKey={shortModelName(m)}
            stackId="1"
            stroke={MODEL_COLORS[i % MODEL_COLORS.length]}
            fill={`url(#gradient-${i})`}
            strokeWidth={2}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
