package main

import "strings"

// ModelPricing defines per-million-token pricing in USD for an Anthropic model.
// Cache reads typically cost 10% of input. Cache writes ("ephemeral") cost 125%.
type ModelPricing struct {
	InputPerMTok       float64
	OutputPerMTok      float64
	CacheReadPerMTok   float64
	CacheCreatePerMTok float64
}

// anthropicPricing — preços oficiais por 1M tokens (USD).
// Fonte: https://www.anthropic.com/pricing (verificar trimestralmente).
// Cache read = 10% do input; cache create (5m write) = 125% do input.
var anthropicPricing = map[string]ModelPricing{
	"claude-opus-4-7":   {InputPerMTok: 15.00, OutputPerMTok: 75.00, CacheReadPerMTok: 1.50, CacheCreatePerMTok: 18.75},
	"claude-opus-4-6":   {InputPerMTok: 15.00, OutputPerMTok: 75.00, CacheReadPerMTok: 1.50, CacheCreatePerMTok: 18.75},
	"claude-opus-4-5":   {InputPerMTok: 15.00, OutputPerMTok: 75.00, CacheReadPerMTok: 1.50, CacheCreatePerMTok: 18.75},
	"claude-opus-4":     {InputPerMTok: 15.00, OutputPerMTok: 75.00, CacheReadPerMTok: 1.50, CacheCreatePerMTok: 18.75},
	"claude-sonnet-4-7": {InputPerMTok: 3.00, OutputPerMTok: 15.00, CacheReadPerMTok: 0.30, CacheCreatePerMTok: 3.75},
	"claude-sonnet-4-6": {InputPerMTok: 3.00, OutputPerMTok: 15.00, CacheReadPerMTok: 0.30, CacheCreatePerMTok: 3.75},
	"claude-sonnet-4-5": {InputPerMTok: 3.00, OutputPerMTok: 15.00, CacheReadPerMTok: 0.30, CacheCreatePerMTok: 3.75},
	"claude-sonnet-4":   {InputPerMTok: 3.00, OutputPerMTok: 15.00, CacheReadPerMTok: 0.30, CacheCreatePerMTok: 3.75},
	"claude-haiku-4-5":  {InputPerMTok: 1.00, OutputPerMTok: 5.00, CacheReadPerMTok: 0.10, CacheCreatePerMTok: 1.25},
	"claude-haiku-4":    {InputPerMTok: 1.00, OutputPerMTok: 5.00, CacheReadPerMTok: 0.10, CacheCreatePerMTok: 1.25},
}

// resolveModelFamily normaliza nomes como "claude-opus-4-5-20251101" pra "claude-opus-4-5".
// Caches são versionados com sufixo de data; queremos só a família.
func resolveModelFamily(name string) string {
	// Trim date suffix like "-20251101"
	if i := strings.LastIndex(name, "-2"); i != -1 && i+9 <= len(name) {
		suffix := name[i+1:]
		if len(suffix) >= 8 && isAllDigits(suffix[:8]) {
			return name[:i]
		}
	}
	return name
}

func isAllDigits(s string) bool {
	for _, c := range s {
		if c < '0' || c > '9' {
			return false
		}
	}
	return true
}

// costUSD computes total cost (USD) given token counts and a model name.
func costUSD(model string, input, output, cacheRead, cacheCreate int64) float64 {
	family := resolveModelFamily(model)
	p, ok := anthropicPricing[family]
	if !ok {
		// Unknown model: assume Sonnet pricing (conservative middle ground).
		p = anthropicPricing["claude-sonnet-4-5"]
	}
	cost := 0.0
	cost += float64(input) / 1_000_000 * p.InputPerMTok
	cost += float64(output) / 1_000_000 * p.OutputPerMTok
	cost += float64(cacheRead) / 1_000_000 * p.CacheReadPerMTok
	cost += float64(cacheCreate) / 1_000_000 * p.CacheCreatePerMTok
	return cost
}
