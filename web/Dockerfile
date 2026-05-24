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

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Next.js standalone output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prisma migrations + schema + config (necessários pro migrate deploy)
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# CLI do Prisma + adapter num diretório isolado (não conflita com standalone node_modules)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.bin/prisma ./prisma-cli/node_modules/.bin/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./prisma-cli/node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./prisma-cli/node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/dotenv ./prisma-cli/node_modules/dotenv

COPY --chown=nextjs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

USER nextjs
EXPOSE 3000

CMD ["./docker-entrypoint.sh"]
