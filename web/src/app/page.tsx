import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6 py-24 font-sans dark:bg-zinc-950">
      <div className="w-full max-w-2xl space-y-10">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-widest text-zinc-500">
            Polaris
          </p>
          <h1 className="text-5xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Compass
          </h1>
          <p className="text-xl text-zinc-600 dark:text-zinc-400">
            Find your AI bearings — before you hit the limit.
          </p>
        </div>

        <div className="space-y-3 text-zinc-700 dark:text-zinc-300">
          <p>
            Compass monitors your Claude Code (and soon Cursor, Copilot, ChatGPT) usage locally and
            tells you what your tokens would cost on pay-as-you-go pricing, projects when you&apos;ll
            hit your plan&apos;s weekly cap, and alerts you before that happens.
          </p>
          <p className="text-sm text-zinc-500">
            Built for indie hackers and dev teams who pay for AI tools and got burned by silent
            limit cuts.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/login"
            className="inline-flex h-11 items-center justify-center rounded-md bg-zinc-950 px-6 text-sm font-medium text-zinc-50 transition hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            Sign in
          </Link>
          <Link
            href="/pricing"
            className="inline-flex h-11 items-center justify-center rounded-md border border-zinc-300 px-6 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            Pricing
          </Link>
        </div>

        <footer className="pt-12 text-xs text-zinc-400">
          Part of the{" "}
          <a href="https://polarisia.com.br" className="underline hover:text-zinc-200">
            Polaris
          </a>{" "}
          ecosystem.
        </footer>
      </div>
    </main>
  );
}
