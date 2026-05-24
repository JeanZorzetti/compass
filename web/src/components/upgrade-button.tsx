"use client";

import { useState } from "react";

interface Props {
  plan: "monthly" | "lifetime";
}

export function UpgradeButton({ plan }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "checkout failed");
      }
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error");
      setLoading(false);
    }
  }

  const isLifetime = plan === "lifetime";
  const label = loading
    ? "Loading…"
    : isLifetime
    ? "Get lifetime access"
    : "Start subscription";

  return (
    <div className="space-y-2">
      <button
        onClick={handleClick}
        disabled={loading}
        className={`block w-full rounded-md px-6 py-3 text-center text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
          isLifetime
            ? "bg-indigo-600 text-white hover:bg-indigo-700"
            : "bg-zinc-950 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
        }`}
      >
        {label}
      </button>
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
