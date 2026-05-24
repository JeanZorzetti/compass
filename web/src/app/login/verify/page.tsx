import Link from "next/link";

export const metadata = {
  title: "Check your email — Compass",
};

export default function VerifyPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6 py-24 dark:bg-zinc-950">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-900">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-6 w-6 text-zinc-700 dark:text-zinc-300"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 8l9 6 9-6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Check your email
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          We sent you a sign-in link. Open it on this device to log in.
        </p>
        <p className="text-xs text-zinc-400">
          <Link href="/login" className="hover:text-zinc-600 dark:hover:text-zinc-300">
            ← Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
