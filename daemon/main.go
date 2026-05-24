// compass daemon — v0.4
// Lê ~/.claude/stats-cache.json, calcula custo USD, persiste snapshot, mostra delta.
// Modo --watch faz polling contínuo. Se COMPASS_TOKEN + --api estão setados, envia pro backend.

package main

import (
	"flag"
	"fmt"
	"os"
	"os/signal"
	"sort"
	"syscall"
	"time"
)

const version = "0.4.0"

// global, setado em main() — usado por tick/runOnce sem precisar passar parâmetro
var ingestClient *IngestClient

func main() {
	var (
		watch    = flag.Bool("watch", false, "rodar em modo contínuo (polling)")
		interval = flag.Duration("interval", 5*time.Minute, "intervalo entre polls em modo --watch (ex: 30s, 5m, 1h)")
		quiet    = flag.Bool("quiet", false, "imprimir só deltas (útil em --watch)")
		showVer  = flag.Bool("version", false, "imprimir versão e sair")
		apiURL   = flag.String("api", os.Getenv("COMPASS_API"), "URL do backend (default: $COMPASS_API). Token via $COMPASS_TOKEN")
	)
	flag.Parse()

	if *showVer {
		fmt.Println("compass", version)
		return
	}

	ingestClient = NewIngestClient(*apiURL)
	if ingestClient != nil {
		fmt.Fprintf(os.Stderr, "[compass] enviando pro backend: %s\n", *apiURL)
	}

	if *watch {
		runWatch(*interval, *quiet)
		return
	}

	runOnce(*quiet)
}

// runOnce: leitura única, formato completo (modo default).
func runOnce(quiet bool) {
	curr, delta, err := readAndDiff()
	if err != nil {
		fmt.Fprintln(os.Stderr, "erro:", err)
		os.Exit(1)
	}
	if quiet {
		printDeltaLine(delta)
	} else {
		printFull(curr, delta)
	}
	if err := persist(curr); err != nil {
		fmt.Fprintln(os.Stderr, "[warn] persist:", err)
	}
	sendToBackend(curr)
}

// runWatch: loop até receber SIGINT/SIGTERM.
func runWatch(interval time.Duration, quiet bool) {
	fmt.Printf("compass v%s — modo --watch (intervalo: %s)\n", version, interval)
	fmt.Println("Ctrl+C pra encerrar.")
	fmt.Println()

	// Primeira leitura imediata
	tick(quiet)

	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	sigs := make(chan os.Signal, 1)
	signal.Notify(sigs, os.Interrupt, syscall.SIGTERM)

	for {
		select {
		case <-ticker.C:
			tick(quiet)
		case sig := <-sigs:
			fmt.Printf("\nrecebido sinal %v, encerrando...\n", sig)
			return
		}
	}
}

func tick(quiet bool) {
	curr, delta, err := readAndDiff()
	if err != nil {
		fmt.Fprintf(os.Stderr, "[%s] erro: %v\n", time.Now().Format("15:04:05"), err)
		return
	}
	if quiet || len(delta.ByModel) == 0 {
		printDeltaLine(delta)
	} else {
		fmt.Printf("\n[%s] mudança detectada\n", time.Now().Format("15:04:05"))
		printDeltaBlock(delta)
	}
	if err := persist(curr); err != nil {
		fmt.Fprintf(os.Stderr, "[warn] persist: %v\n", err)
	}
	sendToBackend(curr)
}

// sendToBackend tenta enviar payload pra cloud. No-op se não houver client configurado.
func sendToBackend(curr *Snapshot) {
	if ingestClient == nil {
		return
	}
	payload := buildPayload(curr, version)
	if err := ingestClient.Send(payload); err != nil {
		fmt.Fprintf(os.Stderr, "[%s] [warn] envio falhou: %v\n", time.Now().Format("15:04:05"), err)
		return
	}
	fmt.Fprintf(os.Stderr, "[%s] [info] enviado pro backend (%d modelos)\n",
		time.Now().Format("15:04:05"), len(payload.ModelTotals))
}

// readAndDiff: helper que faz tudo: lê, monta snapshot, compara com anterior.
func readAndDiff() (*Snapshot, *Delta, error) {
	path, err := claudeStatsPath()
	if err != nil {
		return nil, nil, fmt.Errorf("localizar stats-cache: %w", err)
	}
	if _, err := os.Stat(path); os.IsNotExist(err) {
		return nil, nil, fmt.Errorf("stats-cache.json não encontrado em %s", path)
	}
	stats, err := readStatsCache(path)
	if err != nil {
		return nil, nil, fmt.Errorf("ler stats-cache: %w", err)
	}
	prev, _ := loadPrevious()
	curr := buildSnapshot(stats)
	delta := diff(prev, curr)
	return curr, delta, nil
}

// printDeltaLine: 1 linha compacta, ideal pra modo --watch.
func printDeltaLine(d *Delta) {
	stamp := time.Now().Format("15:04:05")
	if len(d.ByModel) == 0 {
		fmt.Printf("[%s] sem mudanças\n", stamp)
		return
	}
	var totIn, totOut, totCR, totCC int64
	for _, m := range d.ByModel {
		totIn += m.InputTokens
		totOut += m.OutputTokens
		totCR += m.CacheReadInputTokens
		totCC += m.CacheCreationInputTokens
	}
	fmt.Printf("[%s] +in=%s +out=%s +cache_r=%s +cache_c=%s  delta=$%.4f\n",
		stamp,
		thousands(totIn), thousands(totOut),
		thousands(totCR), thousands(totCC),
		d.TotalCost)
}

// printDeltaBlock: bloco multi-linha por modelo.
func printDeltaBlock(d *Delta) {
	if len(d.ByModel) == 0 {
		fmt.Println("  (nenhuma mudança)")
		return
	}
	names := make([]string, 0, len(d.ByModel))
	for n := range d.ByModel {
		names = append(names, n)
	}
	sort.Strings(names)
	for _, name := range names {
		m := d.ByModel[name]
		fmt.Printf("  %s\n", name)
		fmt.Printf("    +in=%s +out=%s +cache_r=%s +cache_c=%s  $%.4f\n",
			thousands(m.InputTokens), thousands(m.OutputTokens),
			thousands(m.CacheReadInputTokens), thousands(m.CacheCreationInputTokens),
			m.CostUSD)
	}
	fmt.Printf("  total delta: $%.4f USD\n", d.TotalCost)
}

// printFull: relatório completo (modo execução única).
func printFull(curr *Snapshot, delta *Delta) {
	path, _ := claudeStatsPath()
	prev, _ := loadPrevious()

	fmt.Printf("=== compass v%s ===\n", version)
	fmt.Println("Arquivo:", path)
	fmt.Println("Snapshot atual:", curr.TakenAt.Format("2006-01-02 15:04:05"))
	if prev != nil {
		fmt.Println("Snapshot anterior:", prev.TakenAt.Format("2006-01-02 15:04:05"))
	} else {
		fmt.Println("Snapshot anterior: (primeira execução)")
	}
	fmt.Println()

	// Acumulado por modelo
	fmt.Println("--- ACUMULADO POR MODELO ---")
	fmt.Println()
	names := make([]string, 0, len(curr.ModelTotals))
	for n := range curr.ModelTotals {
		names = append(names, n)
	}
	sort.Strings(names)
	var grandTotal float64
	for _, name := range names {
		m := curr.ModelTotals[name]
		total := m.InputTokens + m.OutputTokens + m.CacheReadInputTokens + m.CacheCreationInputTokens
		fmt.Printf("  %s\n", name)
		fmt.Printf("    in=%s out=%s cache_r=%s cache_c=%s  total=%s\n",
			thousands(m.InputTokens), thousands(m.OutputTokens),
			thousands(m.CacheReadInputTokens), thousands(m.CacheCreationInputTokens),
			thousands(total))
		fmt.Printf("    custo PAYG estimado: $%.2f USD\n\n", m.CostUSD)
		grandTotal += m.CostUSD
	}
	fmt.Printf("  GRAND TOTAL ESTIMADO: $%.2f USD\n\n", grandTotal)

	// Delta
	fmt.Println("--- DELTA DESDE A ÚLTIMA LEITURA ---")
	printDeltaBlock(delta)
	fmt.Println()
}
