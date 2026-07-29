# Handoff — colocar o Compass de pé (próxima sessão)

Escrito em **2026-07-29** com tudo medido no dia. Substitui o item "compass" que estava no
`roihub/handoff.md` — aquele dizia "falta um A record + 8 segredos" e **as duas metades estavam
imprecisas**. O que está abaixo foi verificado com `curl`, `nslookup` e a CLI da Vercel.

> **Resumo em uma linha:** o app já está no ar em `compass-ten-plum.vercel.app`, mas **sem banco** —
> e o domínio bonito aponta para um servidor onde o Compass não mora mais. Duas correções, nessa
> ordem: **banco primeiro, DNS depois.**

---

## 1 · O que está medido hoje (29/07)

| o que | estado |
|---|---|
| `compass-ten-plum.vercel.app/` | **200** — a landing funciona |
| `/login` | **200** |
| `/api/usage` | **200** |
| `/dashboard` | **307** (redireciona pro login — correto, sem sessão) |
| `/pricing` | 🔴 **500** |
| `compass.polarisia.com.br` | 🔴 **404** — resolve para `2.24.207.200` (EasyPanel), não para a Vercel |
| env vars em produção | 🔴 **4** (`APP_URL`, `ADMIN_EMAIL`, `CRON_SECRET`, `AUTH_SECRET`) — o código lê **16** |
| projeto Vercel | `compass`, criado 29/07 09:25, framework Next.js, root `.` |

### Por que `/pricing` dá 500 — e não é o Stripe

`src/app/pricing/page.tsx:17` chama `prisma.user.count()`. O `src/lib/prisma.ts:9-12` faz
`throw new Error("DATABASE_URL não definido")` quando a variável não existe. **`DATABASE_URL` não
está em produção** → toda página que toca o banco explode. O Stripe não entra nessa: `lib/stripe.ts`
é lazy e só quebra quando alguém clica em comprar.

**Consequência prática:** existe **uma** variável bloqueante, não nove. As outras liberam
funcionalidades (login, e-mail, checkout), não a página.

### Por que o domínio dá 404 — e a armadilha que vem junto

`compass.polarisia.com.br` **tem** registro DNS: um A para `2.24.207.200`, o VPS do EasyPanel, onde
o vhost do Compass não existe mais (404 = servidor certo, vhost perdido). Não é "falta o A record" —
é "o A record aponta pro lugar errado".

🚨 **A Vercel vai te dar o conselho errado.** `vercel domains inspect` manda criar
`A polarisia.com.br 76.76.21.21` **no ápice**. Não faça isso: `polarisia.com.br` responde **200
hoje** servindo o site do **Polaris IA**, do mesmo `2.24.207.200`. Apontar o ápice para a Vercel
derruba o Polaris. **Mexa só no subdomínio `compass`.**

---

## 2 · A única decisão que é sua (e trava tudo)

**Qual Postgres o Compass vai usar em produção?** As migrations existem
(`web/prisma/migrations/`, 4 delas, a última de 24/05) e nunca rodaram no banco novo.

| opção | a favor | contra |
|---|---|---|
| **(a) Postgres gerenciado novo** (Neon/Supabase free) — *recomendado* | 5 min, URL pública que a Vercel alcança, plano free serve de sobra pra 0 usuário | mais um painel |
| (b) Postgres no VPS EasyPanel | já existe e você já opera | precisa expor a porta pra internet pra Vercel chegar; é banco de app público num host compartilhado |
| (c) Vercel Postgres | zero configuração de rede | prende no ecossistema, e o free tier é pequeno |

Como o Compass tem **0 usuário**, **não há dado a preservar** — banco novo e vazio não perde nada.
Se você não disser nada, eu sigo com **(a) Neon**.

---

## 3 · O passo a passo, com quem faz cada parte

### Etapa 1 — banco (destrava `/pricing`)

- **Você:** criar o Postgres e me passar a connection string (Neon: *Create project* → copiar a
  `postgresql://…?sslmode=require`).
- **Eu:** `vercel env add DATABASE_URL production`, `npx prisma migrate deploy` contra ela,
  redeploy e conferir `/pricing` respondendo **200** — sem esse 200 na mão, não fechamos a etapa.

⚠️ A Vercel **não roda o `Dockerfile`** deste repo (o último commit trocou pra `prisma generate` no
`postinstall`), então **`migrate deploy` não acontece sozinho no build** — tem que ser rodado à mão
uma vez, contra a URL nova.

### Etapa 2 — login de verdade

| variável | o que quebra sem ela | onde conseguir |
|---|---|---|
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | login com GitHub | GitHub → *Settings › Developer settings › OAuth Apps*. Callback: `https://compass.polarisia.com.br/api/auth/callback/github` (registre **também** a URL `.vercel.app` enquanto o domínio não vira) |
| `AUTH_RESEND_KEY` | e-mail de magic link e alertas (`lib/email.ts`) | painel do Resend |
| `EMAIL_FROM` | opcional — cai em `Compass <auth@polarisia.com.br>` | 🔴 esse remetente **exige domínio verificado no Resend**; se não estiver, o e-mail some sem erro visível |
| `TRIAL_DAYS` | opcional — default 7 (`lib/auth.ts:40`) | — |

### Etapa 3 — cobrança

| variável | onde |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe → *Developers › API keys* |
| `STRIPE_PRICE_PRO_MONTHLY` e `STRIPE_PRICE_LIFETIME` | os dois `price_…` dos produtos já criados |
| `STRIPE_WEBHOOK_SECRET` | criar o endpoint `POST /api/stripe/webhook` e copiar o `whsec_…` |
| `LIFETIME_SLOTS` | opcional — default 50, é o contador de urgência do `/pricing` |

⚠️ Crie o webhook **apontando para o domínio final**. Se criar apontando pro `.vercel.app`, vai ter
que refazer depois da Etapa 4 — e um webhook morto significa **cliente paga e não vira assinante**
(mesmo padrão que já queimou o goiania: [[roilabs_mercadopago_prod_env_vars]]).

### Etapa 4 — DNS (só depois que `/pricing` estiver 200)

- **Eu:** `vercel domains add compass.polarisia.com.br` no projeto `compass`.
- **Você, na Hostinger** (o `polarisia.com.br` usa `aster/helios.dns-parking.com`): **editar** o
  registro `compass` — de `A 2.24.207.200` para **`CNAME cname.vercel-dns.com`** (ou `A 76.76.21.21`
  se o painel não aceitar CNAME em subdomínio). **Não crie nem altere nada no `@`/ápice.**
- **Eu:** confirmar com `nslookup` + `curl` 200 no domínio final, conferir que `APP_URL` bate com ele
  (se `APP_URL` ficar no `.vercel.app`, os links dos e-mails e o retorno do Stripe apontam pro lugar
  errado) e **atualizar a `homepage` do repo** — a chave do projeto no hub é a URL, trocar domínio
  sem trocar a `homepage` cria projeto duplicado no ranking.

### Etapa 5 — o que faz o produto ter valor

- **Não existe `vercel.json`** neste repo, então `/api/cron/alerts` — o alerta "você vai bater o
  limite", que é a promessa do produto — **nunca é disparado na Vercel**. Ganha um cron no
  `vercel.json` (protegido pelo `CRON_SECRET`, que já está configurado).
- **Não existe `web/.env.example`**, embora o `README.md:37` mande copiá-lo. Fica como saldo da
  sessão: escrever o arquivo com as 16 variáveis, para o próximo ambiente não ser arqueologia.
- **Rotacionar os segredos expostos** antes de qualquer divulgação → [[secrets_to_rotate]].

---

## 4 · Como saber que acabou

```sh
curl -s -o /dev/null -w "%{http_code}\n" https://compass.polarisia.com.br/pricing   # 200
curl -s -o /dev/null -w "%{http_code}\n" https://polarisia.com.br/                  # 200 (Polaris intacto)
nslookup compass.polarisia.com.br 8.8.8.8                                           # 76.76.21.x
```

Os três juntos. O segundo é o que prova que a Etapa 4 não derrubou o vizinho.

---

## 5 · O que **não** é problema do Compass

- **Distribuição.** O produto está completo e cobrável desde 24/05 e tem **0 usuário**; o que falta
  é gente usando, não feature. Este handoff só devolve o app ao ar — a distribuição é outra conversa
  (e o daemon Go já assume `COMPASS_API=https://compass.polarisia.com.br`, então **nada de
  distribuição funciona antes da Etapa 4**).
- **O código.** Nenhum bug foi encontrado: as rotas que não dependem de banco respondem 200. Isto é
  uma sessão de **painel e variável de ambiente**, não de programação.
