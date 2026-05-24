# Compass — daemon

> Find your AI bearings — before you hit the limit.

Daemon Go que lê o uso local do Claude Code (`~/.claude/stats-cache.json`),
calcula custo USD estimado e envia métricas pro backend Compass.

Parte do ecossistema **Polaris** (`polarisia.com.br`).
Subdomínio do app: `compass.polarisia.com.br`.

Cross-platform, binário único, zero dependências externas.

## Uso

```bash
# Execução única (lê, mostra relatório, persiste snapshot)
compass

# Modo daemon contínuo (default: poll a cada 5 min)
compass --watch

# Intervalo customizado
compass --watch --interval=30s

# Output compacto (1 linha por tick)
compass --watch --quiet

# Versão
compass --version
```

## Modo serviço (roda no boot, em background)

Em vez de manter `compass --watch` aberto num terminal, instale como serviço do
sistema (launchd no macOS, systemd no Linux, Service Manager no Windows):

```bash
export COMPASS_TOKEN=<seu token>
export COMPASS_API=https://compass.polarisia.com.br

compass service install     # instala + inicia (roda no boot)
compass service status      # rodando / parado
compass service stop
compass service start
compass service restart
compass service uninstall   # remove o serviço
```

O serviço sincroniza a cada 5 minutos automaticamente.

## Build

### Local (apenas pra seu OS)
```bash
go build -o compass .
```

### Cross-compile (todos os OS)
```bash
./build.sh
```

Gera 5 binários em `dist/`:
- `compass-windows-amd64.exe`
- `compass-darwin-amd64` (macOS Intel)
- `compass-darwin-arm64` (macOS Apple Silicon)
- `compass-linux-amd64`
- `compass-linux-arm64`

Cada binário ~2.1 MB, sem deps.

## Arquitetura

```
main.go       — CLI + modos --watch/--quiet/--version
reader.go     — parser JSON de ~/.claude/stats-cache.json
pricing.go    — tabela de preços Anthropic + costUSD()
snapshot.go   — persiste em ~/.compass/last_snapshot.json + diff()
format.go     — helpers de formatação (thousands)
```

### Fluxo

```
~/.claude/stats-cache.json
         │
         ▼
    readStatsCache()  →  *StatsCache  (raw)
         │
         ▼
    buildSnapshot()   →  *Snapshot   (normalizado, com custo USD)
         │
         ▼
    diff(prev, curr)  →  *Delta      (mudanças desde última leitura)
         │
         ▼
    persist(curr)     →  ~/.compass/last_snapshot.json
```

## Preços usados

Tabela em `pricing.go`. Conferir trimestralmente em https://www.anthropic.com/pricing

| Família | Input/Output (USD/1M) | Cache read (USD/1M) | Cache create (USD/1M) |
|---------|----------------------|---------------------|----------------------|
| Opus 4.x | 15.00 / 75.00 | 1.50 | 18.75 |
| Sonnet 4.x | 3.00 / 15.00 | 0.30 | 3.75 |
| Haiku 4.x | 1.00 / 5.00 | 0.10 | 1.25 |

## Próximos passos (não implementados ainda)

- [ ] POST `/api/usage` pro backend (compass.polarisia.com.br)
- [ ] Auth via `COMPASS_TOKEN` env var
- [ ] Retry com backoff em caso de erro de rede
- [ ] Cache local de eventos não-enviados (offline mode)
- [ ] Suporte a outros provedores (Cursor, Continue, ChatGPT desktop)
