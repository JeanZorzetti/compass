import { signIn } from "@/lib/auth";
import Link from "next/link";

export const metadata = {
  title: "Sign in — Compass",
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6 py-24 dark:bg-zinc-950">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-2 text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
            Polaris · Compass
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Sign in
          </h1>
          <p className="text-sm text-zinc-500">
            Start your 7-day free trial. No credit card required.
          </p>
        </div>

        <LoginError searchParams={searchParams} />

        {/* GitHub */}
        <form
          action={async () => {
            "use server";
            await signIn("github", { redirectTo: "/dashboard" });
          }}
        >
          <button
            type="submit"
            className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-zinc-950 px-6 text-sm font-medium text-zinc-50 transition hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            <GitHubIcon />
            Continue with GitHub
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-zinc-200 dark:border-zinc-800" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-zinc-50 px-2 text-zinc-500 dark:bg-zinc-950">
              or magic link
            </span>
          </div>
        </div>

        {/* Magic Link via Resend */}
        <form
          action={async (formData) => {
            "use server";
            const email = formData.get("email") as string;
            await signIn("resend", { email, redirectTo: "/dashboard" });
          }}
          className="space-y-3"
        >
          <input
            type="email"
            name="email"
            placeholder="you@example.com"
            required
            className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2.5 text-sm placeholder-zinc-400 shadow-sm focus:border-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950 dark:border-zinc-700 dark:bg-zinc-900 dark:placeholder-zinc-500"
          />
          <button
            type="submit"
            className="block h-11 w-full rounded-md border border-zinc-300 px-6 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            Send magic link
          </button>
        </form>

        <p className="text-center text-xs text-zinc-400">
          <Link href="/" className="hover:text-zinc-600 dark:hover:text-zinc-300">
            ← Back to home
          </Link>
        </p>
      </div>
    </main>
  );
}

async function LoginError({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  if (!error) return null;
  return (
    <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
      Sign-in failed: {error}
    </div>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden>
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.55v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.31-1.27-1.66-1.27-1.66-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.69 1.24 3.34.95.1-.74.4-1.24.72-1.53-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.47.11-3.06 0 0 .97-.31 3.18 1.18a11.04 11.04 0 015.79 0c2.21-1.49 3.18-1.18 3.18-1.18.62 1.59.23 2.77.11 3.06.74.81 1.18 1.84 1.18 3.1 0 4.42-2.69 5.39-5.26 5.68.41.36.78 1.06.78 2.13v3.16c0 .31.21.66.79.55C20.21 21.38 23.5 17.07 23.5 12 23.5 5.65 18.35.5 12 .5z" />
    </svg>
  );
}
