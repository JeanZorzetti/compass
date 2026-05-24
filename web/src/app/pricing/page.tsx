import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UpgradeButton } from "@/components/upgrade-button";
import Link from "next/link";

export const metadata = {
  title: "Pricing — Compass",
};

const LIFETIME_SLOTS = Number(process.env.LIFETIME_SLOTS ?? 50);

export default async function PricingPage() {
  const session = await auth();
  const isLoggedIn = Boolean(session?.user?.id);

  // Conta quantos lifetime já foram vendidos pra mostrar urgência
  const lifetimeCount = await prisma.user.count({
    where: { plan: "lifetime" },
  });
  const slotsLeft = Math.max(0, LIFETIME_SLOTS - lifetimeCount);

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-16 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-5xl space-y-12">
        <header className="space-y-3 text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
            Compass · Pricing
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Simple pricing. No surprises.
          </h1>
          <p className="mx-auto max-w-xl text-base text-zinc-600 dark:text-zinc-400">
            Start with a 7-day free trial. No credit card needed. Cancel anytime.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Pro Monthly */}
          <div className="rounded-xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                Compass Pro
              </h2>
              <p className="text-sm text-zinc-500">Monthly subscription</p>
            </div>
            <div className="my-6 flex items-baseline gap-2">
              <span className="text-5xl font-bold text-zinc-950 dark:text-zinc-50">$19</span>
              <span className="text-sm text-zinc-500">/ month</span>
            </div>
            <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
              <Feature>Unlimited daemon syncs</Feature>
              <Feature>Real-time token tracking</Feature>
              <Feature>PAYG cost equivalent</Feature>
              <Feature>Multi-account support</Feature>
              <Feature>Email alerts before limits</Feature>
              <Feature>Cancel anytime</Feature>
            </ul>
            <div className="mt-8">
              {isLoggedIn ? (
                <UpgradeButton plan="monthly" />
              ) : (
                <Link
                  href="/login"
                  className="block w-full rounded-md bg-zinc-950 px-6 py-3 text-center text-sm font-medium text-zinc-50 transition hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
                >
                  Start free trial
                </Link>
              )}
            </div>
          </div>

          {/* Lifetime */}
          <div className="relative rounded-xl border-2 border-indigo-500 bg-white p-8 shadow-lg dark:border-indigo-400 dark:bg-zinc-900">
            <div className="absolute -top-3 left-6 rounded-full bg-indigo-500 px-3 py-1 text-xs font-semibold text-white">
              EARLY BIRD · {slotsLeft} of {LIFETIME_SLOTS} left
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                Compass Lifetime
              </h2>
              <p className="text-sm text-zinc-500">One-time payment, forever access</p>
            </div>
            <div className="my-6 flex items-baseline gap-2">
              <span className="text-5xl font-bold text-zinc-950 dark:text-zinc-50">$49</span>
              <span className="text-sm text-zinc-500">once</span>
            </div>
            <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
              <Feature>Everything in Pro</Feature>
              <Feature>Pay once, use forever</Feature>
              <Feature>All future features included</Feature>
              <Feature>Priority email support</Feature>
              <Feature>Limited to first {LIFETIME_SLOTS} customers</Feature>
            </ul>
            <div className="mt-8">
              {slotsLeft <= 0 ? (
                <button
                  disabled
                  className="block w-full cursor-not-allowed rounded-md bg-zinc-200 px-6 py-3 text-center text-sm font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                >
                  Sold out
                </button>
              ) : isLoggedIn ? (
                <UpgradeButton plan="lifetime" />
              ) : (
                <Link
                  href="/login"
                  className="block w-full rounded-md bg-indigo-600 px-6 py-3 text-center text-sm font-medium text-white transition hover:bg-indigo-700"
                >
                  Sign in to claim
                </Link>
              )}
            </div>
          </div>
        </div>

        <footer className="text-center text-sm text-zinc-500">
          <p>
            Questions?{" "}
            <a href="mailto:support@polarisia.com.br" className="underline hover:text-zinc-700 dark:hover:text-zinc-300">
              support@polarisia.com.br
            </a>
          </p>
          <p className="mt-2">
            <Link href="/" className="hover:text-zinc-700 dark:hover:text-zinc-300">
              ← Back to home
            </Link>
          </p>
        </footer>
      </div>
    </main>
  );
}

function Feature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <svg
        className="mt-0.5 h-4 w-4 flex-shrink-0 text-indigo-500"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
        aria-hidden
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      {children}
    </li>
  );
}
