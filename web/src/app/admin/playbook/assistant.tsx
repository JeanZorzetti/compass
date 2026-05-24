"use client";

import { useState } from "react";
import { addOutreach, markTargetDone } from "./actions";

type Target = {
  id: string;
  sub: string;
  title: string;
  url: string;
  score: number;
  comments: number;
  ageDays: number;
};

export function OutreachAssistant({ targets = [] }: { targets?: Target[] }) {
  // Entrada por URL (fallback: colar manualmente)
  const [targetUrl, setTargetUrl] = useState("");

  // Assistente de tradução/resposta
  const [postEn, setPostEn] = useState("");
  const [postPt, setPostPt] = useState("");
  const [replyPt, setReplyPt] = useState("");
  const [replyEn, setReplyEn] = useState("");
  const [currentUrl, setCurrentUrl] = useState("");
  const [currentSub, setCurrentSub] = useState("");
  const [loadingT, setLoadingT] = useState(false);
  const [loadingR, setLoadingR] = useState(false);
  const [loadingFetch, setLoadingFetch] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function call(path: string, payload: object): Promise<Record<string, unknown>> {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error((data.error as string) ?? "erro");
    return data;
  }

  // Cola a URL do post (achada via fresh_outreach.py local) → puxa texto + traduz
  function subFromUrl(url: string): string {
    const m = url.match(/reddit\.com\/r\/([^/]+)/i);
    return m ? m[1] : "";
  }

  async function carregarDeUrl(url: string, sub: string) {
    setErr(null);
    setCurrentUrl(url);
    setCurrentSub(sub);
    setPostPt("");
    setReplyPt("");
    setReplyEn("");
    setLoadingFetch(true);
    try {
      const d = await call("/api/admin/post-text", { url });
      const text = (d.text as string) ?? "";
      if (!text) {
        setErr(
          (d.error as string) ??
            "Não consegui puxar o post automaticamente. Abra o post no Reddit, copie o texto, e cole no campo 'Post em inglês' abaixo."
        );
        document.getElementById("assist-box")?.scrollIntoView({ behavior: "smooth" });
        return;
      }
      setPostEn(text);
      setLoadingT(true);
      const tr = await call("/api/admin/assist", { mode: "translate", input: text });
      setPostPt((tr.result as string) ?? "");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "erro");
    } finally {
      setLoadingFetch(false);
      setLoadingT(false);
      document.getElementById("assist-box")?.scrollIntoView({ behavior: "smooth" });
    }
  }

  async function carregarUrl() {
    setErr(null);
    if (!targetUrl.includes("reddit.com")) {
      setErr("Cole uma URL válida do Reddit.");
      return;
    }
    setCurrentUrl(targetUrl);
    setCurrentSub(subFromUrl(targetUrl));
    setPostPt("");
    setReplyPt("");
    setReplyEn("");
    setLoadingFetch(true);
    try {
      const d = await call("/api/admin/post-text", { url: targetUrl });
      const text = (d.text as string) ?? "";
      setPostEn(text);
      setLoadingT(true);
      const tr = await call("/api/admin/assist", { mode: "translate", input: text });
      setPostPt((tr.result as string) ?? "");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "erro");
    } finally {
      setLoadingFetch(false);
      setLoadingT(false);
    }
  }

  async function traduzirManual() {
    setErr(null);
    setLoadingT(true);
    try {
      const d = await call("/api/admin/assist", { mode: "translate", input: postEn });
      setPostPt((d.result as string) ?? "");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "erro");
    } finally {
      setLoadingT(false);
    }
  }

  async function gerarResposta() {
    setErr(null);
    setLoadingR(true);
    setCopied(false);
    try {
      const d = await call("/api/admin/assist", { mode: "reply", context: postEn, reply: replyPt });
      setReplyEn((d.result as string) ?? "");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "erro");
    } finally {
      setLoadingR(false);
    }
  }

  function copiar() {
    navigator.clipboard.writeText(replyEn);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      {err && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {err}
        </div>
      )}

      {/* LISTA DE ALVOS (empurrados pelo fresh_outreach.py) */}
      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            🎯 Alvos pra responder ({targets.length})
          </p>
          <span className="text-xs text-zinc-500">
            atualize rodando <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-950">python miner/fresh_outreach.py week</code>
          </span>
        </div>
        {targets.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">
            Nenhum alvo ainda. Rode o comando acima no seu PC — ele busca os posts e envia pra cá
            automaticamente.
          </p>
        ) : (
          <div className="mt-3 max-h-96 space-y-2 overflow-y-auto">
            {targets.map((t) => (
              <div
                key={t.id}
                className="flex items-start justify-between gap-3 rounded-md border border-zinc-100 p-3 dark:border-zinc-800"
              >
                <div className="min-w-0">
                  <p className="text-xs text-zinc-500">
                    {t.ageDays}d · r/{t.sub} · {t.score}↑ {t.comments}💬
                  </p>
                  <p className="text-sm text-zinc-800 dark:text-zinc-200">{t.title}</p>
                  <a
                    href={t.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    abrir no Reddit ↗
                  </a>
                </div>
                <div className="flex flex-shrink-0 flex-col gap-1">
                  <button
                    onClick={() => carregarDeUrl(t.url, t.sub)}
                    className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                  >
                    responder →
                  </button>
                  <form action={markTargetDone}>
                    <input type="hidden" name="id" value={t.id} />
                    <button className="w-full rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
                      ✓ feito
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ENTRADA POR URL (manual, fallback) */}
      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          📍 Ou cole uma URL manualmente
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Ache os alvos rodando <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-950">python miner/fresh_outreach.py week</code> no
          terminal (a busca do Reddit bloqueia o servidor, então roda no seu PC). Cole a URL aqui pra
          puxar o post e traduzir automático.
        </p>
        <div className="mt-3 flex gap-2">
          <input
            type="url"
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
            placeholder="https://www.reddit.com/r/ClaudeAI/comments/..."
            className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
          <button
            onClick={carregarUrl}
            disabled={loadingFetch || !targetUrl.trim()}
            className="flex-shrink-0 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-indigo-700"
          >
            {loadingFetch ? "Carregando..." : "Carregar + traduzir"}
          </button>
        </div>
      </div>

      {/* ASSISTENTE */}
      <div id="assist-box" className="space-y-4">
        {/* Passo 1 */}
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            1. Post em inglês → português {loadingFetch && "(carregando post...)"}
          </p>
          <textarea
            value={postEn}
            onChange={(e) => setPostEn(e.target.value)}
            rows={4}
            placeholder="Clique 'responder este' num alvo acima, ou cole um post aqui..."
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
          <button
            onClick={traduzirManual}
            disabled={loadingT || !postEn.trim()}
            className="mt-2 rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-zinc-50 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-950"
          >
            {loadingT ? "Traduzindo..." : "Traduzir pra português"}
          </button>
          {postPt && (
            <div className="mt-3 rounded-md bg-zinc-100 p-3 text-sm text-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
              {postPt}
            </div>
          )}
        </div>

        {/* Passo 2 */}
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            2. Sua resposta em português → inglês (tom de dev real)
          </p>
          <textarea
            value={replyPt}
            onChange={(e) => setReplyPt(e.target.value)}
            rows={3}
            placeholder="Escreva como você responderia, em português..."
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
          <button
            onClick={gerarResposta}
            disabled={loadingR || !replyPt.trim()}
            className="mt-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-indigo-700"
          >
            {loadingR ? "Gerando..." : "Gerar resposta em inglês"}
          </button>
          {replyEn && (
            <div className="mt-3">
              <div className="rounded-md border border-indigo-200 bg-indigo-50 p-3 text-sm text-zinc-800 dark:border-indigo-900 dark:bg-indigo-950/30 dark:text-zinc-200">
                {replyEn}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={copiar}
                  className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  {copied ? "✓ Copiado!" : "Copiar pro Reddit"}
                </button>
                {/* Registrar na tabela de acompanhamento */}
                {currentUrl && (
                  <form action={addOutreach} className="inline">
                    <input type="hidden" name="url" value={currentUrl} />
                    <input type="hidden" name="community" value={currentSub ? `r/${currentSub}` : ""} />
                    <input type="hidden" name="note" value={replyPt.slice(0, 200)} />
                    <button className="rounded-md border border-emerald-300 px-3 py-1.5 text-xs text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/30">
                      + Registrar na tabela
                    </button>
                  </form>
                )}
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                Revise antes de postar. Se soar limpo demais, gere de novo ou ajuste na mão.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
