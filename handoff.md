# Handoff — colocar o Compass de pé (próxima sessão)

Escrito em **2026-07-29** com tudo medido no dia. Substitui o item "compass" que estava no
`roihub/handoff.md` — aquele dizia "falta um A record + 8 segredos" e **as duas metades estavam
imprecisas**. O que está abaixo foi verificado com `curl`, `nslookup` e a CLI da Vercel.

> **Resumo em uma linha:** o app já está no ar em `compass-ten-plum.vercel.app`, mas **sem banco** —
> e o domínio bonito aponta para um servidor onde o Compass não mora mais. Duas correções, nessa
> ordem: **banco primeiro, DNS depois.**

---

> **Estado em 29/07 14h:** **Etapas 1, 4 e 5 fechadas — o Compass está no ar em
> `https://compass.polarisia.com.br`**, com o Polaris intacto no ápice. Faltam **Etapa 2**
> (GitHub OAuth + Resend → ninguém loga) e **Etapa 3** (Stripe → ninguém paga).
>
> **Etapa 1, como ficou:** você escolheu a opção **(b) Postgres do VPS EasyPanel**, não o Neon.
> `postgres://compass_db@2.24.207.200:5451/compass_db` — PG 16.14, alcançável da internet, as 4
> migrations aplicadas em 29/07. A URL está em `DATABASE_URL` production e no `web/.env` local
> (gitignorado, é o que faz `prisma migrate deploy` funcionar da sua máquina).
>
> 🔴 **Duas dívidas que essa escolha criou.** O servidor **não suporta TLS** (`sslmode=require`
> devolve *"the server does not support SSL connections"*), então `sslmode=disable` não é preferência
> — é a única opção, e senha + dados dos usuários trafegam em texto puro entre a Vercel e o VPS. E a
> senha usada é a mesma de [[secrets_to_rotate]]. Antes de ter usuário de verdade: ligar TLS no
> Postgres do EasyPanel e trocar a senha (ou migrar pro Neon, que já vem com TLS).

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

### ✅ Etapa 1 — banco (destrava `/pricing`) — FEITA 29/07

Postgres do VPS, `DATABASE_URL` em production, 4 migrations aplicadas, deploy
`compass-j0cz6g25g`, e o 200 conferido na mão: `/`, `/login` e `/pricing` respondem **200**.

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

### ✅ Etapa 4 — DNS — FEITA 29/07

O registro `compass` na Hostinger virou **`A 76.76.21.21`** (continua tipo A). O `homepage` do repo
já estava certo. `APP_URL` estava no `.vercel.app` e foi trocada para o domínio final + redeploy
(`compass-52v7k2nhk`) — sem isso os links dos e-mails e o retorno do Stripe apontariam pro lugar
errado.

🔴 **O CNAME não funciona aqui, e o erro do painel é enganoso.** Trocar o tipo do registro para
CNAME devolve *"RRset compass.polarisia.com.br IN CNAME must not be used with any other type on the
same name"*: um CNAME não coexiste com nenhum outro registro no mesmo nome (RFC 1034), e o A antigo
ainda estava lá. Editar o **valor** do A é uma operação só, sem deleção e sem janela fora do ar.

🚨 **A segunda armadilha da Vercel.** O `domains inspect` oferece "mude seus nameservers para
`ns1/ns2.vercel-dns.com`". Isso move o DNS **inteiro** do `polarisia.com.br` da Hostinger pra Vercel
e derruba o Polaris — é a armadilha do ápice com outra roupa. Só o registro `compass` se toca.

O certificado TLS não sai sozinho na hora: logo depois do DNS propagar, o HTTPS dava
`curl: (35)` enquanto o HTTP já respondia 200. `vercel certs issue compass.polarisia.com.br`
resolve em 13s.

### Etapa 5 — o que faz o produto ter valor

- ✅ **`web/vercel.json`** (commit `90eaa9d`): cron diário `0 13 * * *` em `/api/cron/alerts`. A
  Vercel injeta o `Authorization: Bearer $CRON_SECRET` sozinha, e o `CRON_SECRET` já está em prod.
  **Só passa a valer no próximo deploy.** Deploy é por CLI a partir de `web/` (é lá que mora o
  `.vercel`), não por git — a Root Directory `.` do painel não é usada.
- ✅ **`web/.env.example`** (mesmo commit): as 16 variáveis. O `web/.gitignore:34` tinha `.env*` sem
  negação e estava engolindo o arquivo — corrigido com `!.env.example`.
- ⏳ **Rotacionar os segredos expostos** antes de qualquer divulgação → [[secrets_to_rotate]].

---

## 4 · Como saber que acabou

```sh
curl -s -o /dev/null -w "%{http_code}\n" https://compass.polarisia.com.br/pricing   # 200
curl -s -o /dev/null -w "%{http_code}\n" https://polarisia.com.br/                  # 200 (Polaris intacto)
nslookup compass.polarisia.com.br 8.8.8.8                                           # 76.76.21.x
```

Os três juntos. O segundo é o que prova que a Etapa 4 não derrubou o vizinho.

**Rodados em 29/07 14h: `200`, `200`, `76.76.21.21`.** `/login` também responde 200 — mas a tela de
login não *funciona* até a Etapa 2, porque não há provider configurado.

---

## 5 · O que **não** é problema do Compass

- **Distribuição.** O produto está completo e cobrável desde 24/05 e tem **0 usuário**; o que falta
  é gente usando, não feature. Este handoff só devolve o app ao ar — a distribuição é outra conversa
  (e o daemon Go já assume `COMPASS_API=https://compass.polarisia.com.br`, então **nada de
  distribuição funciona antes da Etapa 4**).
- **O código.** Nenhum bug foi encontrado: as rotas que não dependem de banco respondem 200. Isto é
  uma sessão de **painel e variável de ambiente**, não de programação.
