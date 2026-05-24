import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-zinc-50 px-6 py-24 font-sans dark:bg-zinc-950">
      <div className="w-full max-w-2xl space-y-12">
        {/* Hero */}
        <div className="space-y-4">
          <p className="text-sm font-medium uppercase tracking-widest text-zinc-500">
            Polaris · Compass
          </p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl">
            Know before you hit the AI limit.
          </h1>
          <p className="text-xl text-zinc-600 dark:text-zinc-400">
            Compass watches your Claude Code usage and warns you{" "}
            <span className="text-zinc-900 dark:text-zinc-200">before</span> you get throttled —
            across every account you run — and shows what it would cost on pay-as-you-go.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/login"
            className="inline-flex h-11 items-center justify-center rounded-md bg-zinc-950 px-6 text-sm font-medium text-zinc-50 transition hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            Start free trial
          </Link>
          <Link
            href="/pricing"
            className="inline-flex h-11 items-center justify-center rounded-md border border-zinc-300 px-6 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            See pricing
          </Link>
        </div>

        {/* Diferenciais — o que tracker grátis não faz */}
        <div className="grid gap-6 sm:grid-cols-3">
          <Feature
            title="Alerts before, not after"
            body="Learns your weekly baseline and emails you as you approach it. No more discovering the cap mid-task."
          />
          <Feature
            title="What it'd really cost"
            body="See the pay-as-you-go equivalent of your usage. Most users are shocked how much their flat plan saves them."
          />
          <Feature
            title="All accounts, one view"
            body="Run multiple Claude accounts? Compass aggregates them. Cursor, Copilot and more coming."
          />
        </div>

        {/* Honest positioning vs free trackers */}
        <div className="rounded-lg border border-zinc-200 bg-white p-5 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
          <p className="font-medium text-zinc-800 dark:text-zinc-200">
            &ldquo;Doesn&apos;t my tool already show usage?&rdquo;
          </p>
          <p className="mt-2">
            Built-in panels and free trackers show you where you{" "}
            <span className="italic">are</span>. Compass tells you where you&apos;re{" "}
            <span className="italic">heading</span> — it predicts when you&apos;ll hit the wall,
            warns you by email, works across accounts and tools, and runs on Windows, macOS and
            Linux. If a free menu-bar tracker covers you, use it. Compass is for people who got
            burned by hitting limits with no warning.
          </p>
        </div>

        <footer className="pt-8 text-xs text-zinc-400">
          Part of the{" "}
          <a href="https://polarisia.com.br" className="underline hover:text-zinc-600 dark:hover:text-zinc-200">
            Polaris
          </a>{" "}
          ecosystem.
        </footer>
      </div>
    </main>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="space-y-1.5">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{body}</p>
    </div>
  );
}
