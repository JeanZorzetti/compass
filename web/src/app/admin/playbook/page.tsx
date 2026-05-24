import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { addOutreach, updateOutreachStatus, deleteOutreach } from "./actions";
import { OutreachAssistant } from "./assistant";

export const metadata = { title: "Playbook — Compass Admin" };
export const dynamic = "force-dynamic";

export default async function PlaybookPage() {
  const session = await auth();
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!session?.user?.email || session.user.email !== adminEmail) {
    notFound();
  }

  const logs = await prisma.outreachLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const pendingTargets = await prisma.outreachTarget.findMany({
    where: { done: false },
    orderBy: [{ score: "desc" }],
    take: 40,
  });

  const respondidos = logs.length;
  const convertidos = logs.filter((l) => l.status === "converted").length;
  const removidos = logs.filter((l) => l.status === "removed").length;

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-10 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-4xl space-y-10">
        <header>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
                Compass · Admin · POP
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                Procedimento de Outreach nos Fóruns
              </h1>
            </div>
            <Link
              href="/admin"
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
            >
              ← Admin
            </Link>
          </div>
        </header>

        {/* Resumo */}
        <div className="grid gap-4 sm:grid-cols-3">
          <MiniStat label="Posts respondidos" value={String(respondidos)} />
          <MiniStat label="Convertidos" value={String(convertidos)} />
          <MiniStat label="Removidos" value={String(removidos)} warn={removidos > 0} />
        </div>

        {/* O PROCEDIMENTO */}
        <Section title="📋 O fluxo, passo a passo">
          <Step n={1} title="Gerar alvos frescos">
            No terminal, dentro de <Code>miner/</Code>:
            <Pre>{`cd miner
.venv/Scripts/python.exe fresh_outreach.py week`}</Pre>
            Isso lista reclamações dos últimos 7 dias sobre limite de IA, ranqueadas por
            engajamento. Os IDs mudam toda semana — rode antes de cada sessão.
          </Step>

          <Step n={2} title="Escolher 2-3 alvos">
            Priorize, nesta ordem: (a) gente <strong>buscando solução</strong> (&ldquo;how do I
            stop hitting limits&rdquo;), (b) posts <strong>ativos</strong> (comentários nas últimas
            horas), (c) <strong>dor pura</strong> sobre limite/cobrança. Evite posts com 0
            comentários ou mais de 30 dias.
          </Step>

          <Step n={3} title="Ler o post INTEIRO antes de responder">
            Cada resposta tem que ser específica pro que a pessoa disse. Genérico = ignorado ou
            downvote. Pesque um detalhe do post pra citar.
          </Step>

          <Step n={4} title="Escrever a resposta — em tom HUMANO">
            Lidere com empatia (&ldquo;tive exatamente essa dor&rdquo;), produto entra no fim,
            discreto. 2-4 frases no máximo. Veja as regras de tom abaixo (críticas).
          </Step>

          <Step n={5} title="Postar e registrar aqui">
            Depois de responder, cole a URL na tabela embaixo pra acompanhar. Atualize o status
            conforme rolar (upvoted / removed / converted).
          </Step>

          <Step n={6} title="Acompanhar">
            Volte ao post em algumas horas. Responda quem replicar (engajamento empurra pro topo).
            Anote o resultado.
          </Step>
        </Section>

        {/* REGRAS DE TOM */}
        <Section title="🚫 Regras de tom (NÃO parecer IA)">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Um dev já te pegou no r/cursor: &ldquo;Did you also use cursor to post this? These
            dashes are very long&rdquo;. Os travessões entregaram. Reddit/HN crucificam texto de IA.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
              <p className="text-sm font-semibold text-red-700 dark:text-red-300">NUNCA</p>
              <ul className="mt-2 space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
                <li>• Travessão longo (—) — use hífen normal ou vírgula</li>
                <li>• Frases perfeitas, estrutura impecável</li>
                <li>• &ldquo;eye-opening&rdquo;, &ldquo;game-changer&rdquo;, &ldquo;furthermore&rdquo;</li>
                <li>• Textão (mais de 4 frases)</li>
                <li>• Tom de vendedor / pitch</li>
              </ul>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">SEMPRE</p>
              <ul className="mt-2 space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
                <li>• lowercase às vezes, frases curtas</li>
                <li>• gíria (lmao, tbh, ngl, honestly, kinda)</li>
                <li>• tom de desabafo real</li>
                <li>• hífen normal (-) nunca (—)</li>
                <li>• admitir limitação / rir de si mesmo</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs font-medium text-zinc-500">EXEMPLO — limite sem aviso</p>
            <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
              honestly the limit isnt even the worst part, its that it hits with zero warning. got
              tired of it and built a thing that watches my usage and pings me before i hit the wall.
              compass.polarisia.com.br if u want it
            </p>
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            Mais templates em <Code>OUTREACH_TARGETS.md</Code>. Sempre adapte — nunca cole igual
            (Reddit bane texto repetido).
          </p>
        </Section>

        {/* ROTINA SEMANAL */}
        <Section title="🗓️ Rotina semanal">
          <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
            <li>
              <strong>Toda semana:</strong> rodar <Code>fresh_outreach.py week</Code>, responder
              2-3 posts/dia (espalhado, não 10 de uma vez = flag de spam).
            </li>
            <li>
              <strong>Construir reputação:</strong> comente genuinamente em outros posts (sem
              divulgar) pra ganhar karma. Isso destrava posts próprios em ~1-2 semanas.
            </li>
            <li>
              <strong>Responder réplicas:</strong> volte aos posts onde comentou, responda quem
              interagiu. Mantém vivo.
            </li>
            <li>
              <strong>Checar este admin:</strong> veja se chegaram trials/users novos (aba Admin).
            </li>
          </ul>
        </Section>

        {/* MÉTRICAS / METAS */}
        <Section title="🎯 Metas (do plano original)">
          <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
            <li>• <strong>D+30:</strong> 100 visitantes únicos — se não bater, o problema é canal/distribuição</li>
            <li>• <strong>D+60:</strong> 10 trials ativados — se não, a oferta/landing não convence</li>
            <li>• <strong>D+90:</strong> 3 pagantes ($60-90 MRR) — <strong className="text-red-600 dark:text-red-400">kill criteria: 0 pagantes = mata o projeto</strong></li>
            <li>• <strong>D+180:</strong> $500 MRR (20-30 clientes) ou pivota</li>
          </ul>
          <p className="mt-3 text-xs text-zinc-500">
            Acompanhe os números reais na <Link href="/admin" className="underline">aba Admin</Link> (MRR, trials, conversão).
          </p>
        </Section>

        {/* CENTRO DE COMANDO */}
        <Section title="🚀 Centro de comando (tradução + resposta)">
          <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
            Cole a URL de um post do Reddit (ache os alvos rodando{" "}
            <Code>python miner/fresh_outreach.py week</Code> no terminal). O assistente{" "}
            <strong>traduz</strong> pra você entender e <strong>gera sua resposta</strong> em inglês
            com tom de dev real. Você escreve tudo em português.
          </p>
          <OutreachAssistant
            targets={pendingTargets.map((t) => ({
              id: t.id,
              sub: t.sub,
              title: t.title,
              url: t.url,
              score: t.score,
              comments: t.comments,
              ageDays: t.ageDays,
            }))}
          />
        </Section>

        {/* TABELA DE ACOMPANHAMENTO */}
        <Section title="📊 Posts respondidos">
          {/* Form de adicionar */}
          <form action={addOutreach} className="mb-4 grid gap-2 sm:grid-cols-[1fr_140px_auto]">
            <input
              name="url"
              type="url"
              required
              placeholder="https://reddit.com/r/..."
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <input
              name="community"
              placeholder="r/cursor"
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <button className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-zinc-50 dark:bg-zinc-50 dark:text-zinc-950">
              + Registrar
            </button>
            <input
              name="note"
              placeholder="nota / o que respondeu (opcional)"
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm sm:col-span-3 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </form>

          <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 text-xs uppercase tracking-wider text-zinc-500 dark:border-zinc-800">
                <tr>
                  <th className="px-4 py-3">Quando</th>
                  <th className="px-4 py-3">Comunidade</th>
                  <th className="px-4 py-3">Post</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/60">
                    <td className="px-4 py-3 text-zinc-500">
                      {formatDistanceToNow(l.createdAt, { addSuffix: true })}
                    </td>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">{l.community}</td>
                    <td className="max-w-xs truncate px-4 py-3">
                      <a href={l.url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline dark:text-indigo-400">
                        {l.url.replace("https://www.reddit.com", "").slice(0, 50)}
                      </a>
                      {l.note && <p className="text-xs text-zinc-400">{l.note}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <form action={updateOutreachStatus} className="flex items-center gap-1">
                        <input type="hidden" name="id" value={l.id} />
                        <select
                          name="status"
                          defaultValue={l.status}
                          className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                        >
                          <option value="responded">respondido</option>
                          <option value="upvoted">upvoted</option>
                          <option value="converted">convertido</option>
                          <option value="removed">removido</option>
                        </select>
                        <button className="rounded bg-zinc-200 px-2 py-1 text-xs dark:bg-zinc-800">ok</button>
                      </form>
                    </td>
                    <td className="px-4 py-3">
                      <form action={deleteOutreach}>
                        <input type="hidden" name="id" value={l.id} />
                        <button className="text-xs text-red-500 hover:underline">x</button>
                      </form>
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
                      Nenhum post registrado ainda. Adicione acima conforme responder.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Section>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-zinc-950 text-sm font-semibold text-zinc-50 dark:bg-zinc-50 dark:text-zinc-950">
        {n}
      </div>
      <div className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
        <p className="font-semibold text-zinc-900 dark:text-zinc-100">{title}</p>
        <div>{children}</div>
      </div>
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
      {children}
    </code>
  );
}

function Pre({ children }: { children: React.ReactNode }) {
  return (
    <pre className="mt-2 overflow-x-auto rounded bg-zinc-100 p-3 text-xs text-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
      <code>{children}</code>
    </pre>
  );
}

function MiniStat({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={`rounded-lg border p-4 ${warn ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30" : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"}`}>
      <p className="text-xs uppercase tracking-wider text-zinc-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${warn ? "text-red-700 dark:text-red-300" : "text-zinc-950 dark:text-zinc-50"}`}>{value}</p>
    </div>
  );
}
