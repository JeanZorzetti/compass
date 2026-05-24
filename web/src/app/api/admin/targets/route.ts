import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

const SUBREDDITS = ["ClaudeAI", "cursor", "ChatGPTCoding", "ChatGPT", "OpenAI"];
const QUERIES = [
  "limit",
  "rate limit",
  "usage limit",
  "throttled",
  "hit the limit",
  "ran out",
  "bait and switch",
  "weekly limit",
];
const PAIN_HINTS = [
  "limit", "throttl", "rate", "cap", "ran out", "bait", "switch",
  "downgrade", "burning", "unusable", "scam", "charged", "expensive",
  "ridiculous", "wtf", "frustrat", "out of",
];

const UA = "Compass/1.0 (admin outreach tool)";

type Target = {
  id: string;
  sub: string;
  title: string;
  score: number;
  comments: number;
  ageDays: number;
  url: string;
};

function looksLikePain(title: string): boolean {
  const t = title.toLowerCase();
  return PAIN_HINTS.some((h) => t.includes(h));
}

async function fetchSearch(subreddit: string, query: string, t: string): Promise<Record<string, unknown>[]> {
  const url = new URL(`https://www.reddit.com/r/${subreddit}/search.json`);
  url.searchParams.set("q", query);
  url.searchParams.set("restrict_sr", "on");
  url.searchParams.set("limit", "100");
  url.searchParams.set("t", t);
  url.searchParams.set("sort", "new");
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA } });
    if (!r.ok) return [];
    const data = await r.json();
    return (data?.data?.children ?? [])
      .filter((c: { kind?: string }) => c.kind === "t3")
      .map((c: { data: Record<string, unknown> }) => c.data);
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!session?.user?.email || session.user.email !== adminEmail) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const timeFilter = (body?.timeFilter as string) || "week"; // week | month
  const tf = timeFilter === "month" ? "month" : "week";

  const seen = new Map<string, Target>();
  const now = Date.now();

  for (const sub of SUBREDDITS) {
    for (const q of QUERIES) {
      const posts = await fetchSearch(sub, q, tf);
      for (const p of posts) {
        const id = String(p.id);
        if (seen.has(id)) continue;
        const title = String(p.title ?? "");
        if (!looksLikePain(title)) continue;
        const created = Number(p.created_utc ?? 0) * 1000;
        const ageDays = Math.floor((now - created) / (24 * 60 * 60 * 1000));
        if (ageDays > 30) continue;
        seen.set(id, {
          id,
          sub,
          title,
          score: Number(p.score ?? 0),
          comments: Number(p.num_comments ?? 0),
          ageDays,
          url: "https://www.reddit.com" + String(p.permalink ?? ""),
        });
      }
      // pequena pausa pra não martelar o Reddit
      await new Promise((r) => setTimeout(r, 400));
    }
  }

  const targets = Array.from(seen.values())
    .sort((a, b) => b.score + b.comments - (a.score + a.comments))
    .slice(0, 30);

  return NextResponse.json({ targets, count: targets.length, timeFilter: tf });
}
