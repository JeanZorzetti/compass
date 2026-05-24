import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 30;

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (_client) return _client;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY não configurada");
  _client = new Anthropic({ apiKey: key });
  return _client;
}

const MODEL = "claude-haiku-4-5-20251001";

// Modo 1: traduzir post EN -> PT (pra Jean entender)
const TRANSLATE_PROMPT = `Traduza o seguinte post/comentário de fórum do inglês para português brasileiro, de forma natural e fiel ao tom original (incluindo gírias e frustração). Responda APENAS com a tradução, sem comentários.

Texto:
{input}`;

// Modo 2: resposta PT do Jean -> EN com tom de dev REAL (anti-IA)
const REPLY_PROMPT = `You are helping a Brazilian dev reply to a Reddit/forum post in English. He wrote his reply in Portuguese. Convert it to English that sounds like a REAL developer wrote it casually on Reddit — NOT like AI or a translation.

CRITICAL rules for the English output:
- NEVER use em-dashes (—). Use regular hyphens, commas, or nothing.
- lowercase is fine, casual is good. short sentences.
- use natural dev slang where it fits: honestly, tbh, ngl, lmao, kinda, imo
- NO marketing words (eye-opening, game-changer, seamless, leverage)
- keep it SHORT (2-4 sentences max)
- sound human and slightly imperfect, not polished
- preserve his meaning and any link he included

Context of the post he's replying to (English):
{context}

His reply (Portuguese):
{reply}

Output ONLY the English reply, nothing else.`;

export async function POST(req: NextRequest) {
  const session = await auth();
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!session?.user?.email || session.user.email !== adminEmail) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const mode = body?.mode as "translate" | "reply" | undefined;

  try {
    let prompt: string;
    if (mode === "translate") {
      const input = String(body?.input ?? "").trim();
      if (!input) return NextResponse.json({ error: "texto vazio" }, { status: 400 });
      prompt = TRANSLATE_PROMPT.replace("{input}", input.slice(0, 6000));
    } else if (mode === "reply") {
      const context = String(body?.context ?? "").trim().slice(0, 3000);
      const reply = String(body?.reply ?? "").trim();
      if (!reply) return NextResponse.json({ error: "resposta vazia" }, { status: 400 });
      prompt = REPLY_PROMPT.replace("{context}", context || "(no context provided)").replace(
        "{reply}",
        reply.slice(0, 2000)
      );
    } else {
      return NextResponse.json({ error: "mode inválido" }, { status: 400 });
    }

    const resp = await getClient().messages.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const text = resp.content[0].type === "text" ? resp.content[0].text.trim() : "";
    return NextResponse.json({ result: text });
  } catch (err) {
    const message = err instanceof Error ? err.message : "erro";
    console.error("[admin/assist] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
