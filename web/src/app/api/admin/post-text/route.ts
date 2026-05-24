import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await auth();
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!session?.user?.email || session.user.email !== adminEmail) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const url = String(body?.url ?? "").trim();
  if (!url.includes("reddit.com")) {
    return NextResponse.json({ error: "url inválida" }, { status: 400 });
  }

  // Reddit serve o post como JSON adicionando .json
  const jsonUrl = url.replace(/\/?$/, "") + ".json";
  try {
    const r = await fetch(jsonUrl, { headers: { "User-Agent": "Compass/1.0 (admin)" } });
    if (!r.ok) return NextResponse.json({ error: `reddit ${r.status}` }, { status: 502 });
    const data = await r.json();
    const post = data?.[0]?.data?.children?.[0]?.data;
    const title = String(post?.title ?? "");
    const selftext = String(post?.selftext ?? "");
    const text = [title, selftext].filter(Boolean).join("\n\n");
    return NextResponse.json({ text: text || title });
  } catch {
    return NextResponse.json({ error: "falha ao buscar post" }, { status: 502 });
  }
}
