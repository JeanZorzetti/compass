"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ModelTotal } from "@/lib/usage-queries";

interface Props {
  data: ModelTotal[];
}

function shortModelName(name: string): string {
  return name
    .replace("claude-", "")
    .replace(/-2\d{7}$/, "")
    .replace("-20251101", "");
}

export function ModelCostChart({ data }: Props) {
  const chartData = data.map((m) => ({
    model: shortModelName(m.model),
    cost: Number(m.costUsd.toFixed(2)),
  }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(180, chartData.length * 48 + 30)}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
        <XAxis
          type="number"
          stroke="#737373"
          fontSize={11}
          tickFormatter={(v) => `$${v}`}
        />
        <YAxis
          type="category"
          dataKey="model"
          stroke="#737373"
          fontSize={11}
          width={140}
        />
        <Tooltip
          formatter={(value) => [`$${Number(value).toFixed(2)} USD`, "PAYG cost"]}
          contentStyle={{ background: "white", border: "1px solid #e5e7eb", borderRadius: 6 }}
        />
        <Bar dataKey="cost" fill="#6366f1" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
