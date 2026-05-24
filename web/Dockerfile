# ─── Stage 1: deps ───
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ─── Stage 2: builder ───
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Prisma client precisa ser gerado antes do build
RUN npx prisma generate
RUN npm run build

# ─── Stage 3: migrator deps ───
# Mantém um node_modules completo só pra rodar `prisma migrate deploy`.
# O standalone do Next.js não inclui o CLI do Prisma.
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
# Bind em todas as interfaces — sem isto o standalone escuta só em localhost
# e o proxy do EasyPanel não alcança o container ("Service is not reachable").
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Next.js standalone output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# ── Migrate workspace auto-contido ──
# O Prisma 7 CLI precisa do config file no mesmo CWD onde 'prisma/config'
# resolve via node_modules. Montamos /app/migrate como workspace completo:
# node_modules + prisma/ + prisma.config.ts + package.json juntos.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./migrate/node_modules
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./migrate/prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./migrate/prisma.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./migrate/package.json

COPY --chown=nextjs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER nextjs
EXPOSE 3000

CMD ["./docker-entrypoint.sh"]
