# Compass

> Find your AI bearings — before you hit the limit.

Compass is an AI usage monitor for developers. It tracks your Claude Code usage
locally, shows what it would cost on pay-as-you-go pricing, and alerts you before
you hit your plan's limits.

Part of the [Polaris](https://polarisia.com.br) ecosystem.

## Repository structure

```
compass/
├── daemon/   → Go CLI that reads ~/.claude/stats-cache.json and syncs to the backend
└── web/      → Next.js backend + dashboard (compass.polarisia.com.br)
```

## Daemon (Go)

Cross-platform binary, no dependencies. Reads your local Claude Code usage and
syncs it to your Compass account.

```bash
export COMPASS_TOKEN=<your token from the dashboard>
export COMPASS_API=https://compass.polarisia.com.br
compass --watch
```

See [daemon/README.md](daemon/README.md) for build instructions.

## Web (Next.js)

Backend API + dashboard. Stack: Next.js 16, Prisma 7, NextAuth 5, Stripe, Resend.

```bash
cd web
cp .env.example .env   # fill in your values
npm install
npx prisma migrate deploy
npm run dev
```

## License

Proprietary — © Polaris / ROI Labs.
