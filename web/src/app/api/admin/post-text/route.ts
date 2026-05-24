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

  // Monta a URL .json corretamente: remove barra/querystring finais e adiciona /.json
  const clean = url.split("?")[0].replace(/\/+$/, "");
  const jsonUrl = `${clean}/.json`;

  try {
    const r = await fetch(jsonUrl, {
      headers: { "User-Agent": "Compass/1.0 (admin)" },
      signal: AbortSignal.timeout(15000),
    });

    if (r.status === 403) {
      return NextResponse.json(
        { error: "Reddit bloqueou o servidor (403). Cole o texto do post manualmente no campo abaixo." },
        { status: 200 } // 200 pra não quebrar o front; erro vem no campo
      );
    }
    if (!r.ok) {
      return NextResponse.json({ error: `reddit retornou ${r.status}`, text: "" }, { status: 200 });
    }

    // Garante que é JSON antes de parsear (Reddit às vezes devolve HTML)
    const ct = r.headers.get("content-type") ?? "";
    if (!ct.includes("json")) {
      return NextResponse.json(
        { error: "Reddit não devolveu JSON. Cole o texto manualmente.", text: "" },
        { status: 200 }
      );
    }

    const data = await r.json();
    const post = data?.[0]?.data?.children?.[0]?.data;
    const title = String(post?.title ?? "");
    const selftext = String(post?.selftext ?? "");
    const text = [title, selftext].filter(Boolean).join("\n\n");
    return NextResponse.json({ text: text || title });
  } catch (e) {
    const msg = e instanceof Error && e.name === "TimeoutError" ? "timeout no Reddit" : "falha ao buscar post";
    return NextResponse.json({ error: msg, text: "" }, { status: 200 });
  }
}
