package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

// IngestPayload é o body do POST /api/usage.
// Compatível com o schema Zod no backend Next.js.
type IngestPayload struct {
	DaemonVersion     string                 `json:"daemon_version"`
	TakenAt           string                 `json:"taken_at"` // ISO 8601
	ModelTotals       map[string]PayloadStat `json:"model_totals"`
	DailyMessages     map[string]int         `json:"daily_messages,omitempty"`
	DailySessions     map[string]int         `json:"daily_sessions,omitempty"`
	DailyToolCalls    map[string]int         `json:"daily_tool_calls,omitempty"`
	DailyTokensByModel map[string]map[string]int `json:"daily_tokens_by_model,omitempty"`
}

type PayloadStat struct {
	InputTokens         int64   `json:"input_tokens"`
	OutputTokens        int64   `json:"output_tokens"`
	CacheReadTokens     int64   `json:"cache_read_tokens"`
	CacheCreateTokens   int64   `json:"cache_create_tokens"`
	WebSearchRequests   int     `json:"web_search_requests"`
	CostUSDEstimated    float64 `json:"cost_usd_estimated"`
}

// buildPayload converte o snapshot atual no formato que o backend espera.
func buildPayload(s *Snapshot, daemonVersion string) IngestPayload {
	models := make(map[string]PayloadStat, len(s.ModelTotals))
	for name, m := range s.ModelTotals {
		models[name] = PayloadStat{
			InputTokens:       m.InputTokens,
			OutputTokens:      m.OutputTokens,
			CacheReadTokens:   m.CacheReadInputTokens,
			CacheCreateTokens: m.CacheCreationInputTokens,
			WebSearchRequests: m.WebSearchRequests,
			CostUSDEstimated:  m.CostUSD,
		}
	}
	return IngestPayload{
		DaemonVersion:      daemonVersion,
		TakenAt:            s.TakenAt.UTC().Format(time.RFC3339),
		ModelTotals:        models,
		DailyMessages:      s.DailyMessages,
		DailySessions:      s.DailySessions,
		DailyToolCalls:     s.DailyToolCalls,
		DailyTokensByModel: s.DailyTokensBy,
	}
}

// IngestClient envia payloads pro backend Compass.
type IngestClient struct {
	BaseURL string
	Token   string
	HTTP    *http.Client
}

// NewIngestClient retorna um cliente configurado, ou nil se faltar URL/token.
// Se faltar, daemon roda em modo "local only" (sem POST).
func NewIngestClient(baseURL string) *IngestClient {
	token := os.Getenv("COMPASS_TOKEN")
	if baseURL == "" || token == "" {
		return nil
	}
	return &IngestClient{
		BaseURL: baseURL,
		Token:   token,
		HTTP:    &http.Client{Timeout: 30 * time.Second},
	}
}

// Send tenta POST /api/usage com retry exponencial (3 tentativas: 1s, 3s, 9s).
// Retorna nil em sucesso ou último erro acumulado.
func (c *IngestClient) Send(payload IngestPayload) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal payload: %w", err)
	}

	endpoint := c.BaseURL + "/api/usage"
	delays := []time.Duration{0, 1 * time.Second, 3 * time.Second, 9 * time.Second}
	var lastErr error

	for attempt, delay := range delays {
		if delay > 0 {
			time.Sleep(delay)
		}

		req, err := http.NewRequest(http.MethodPost, endpoint, bytes.NewReader(body))
		if err != nil {
			return fmt.Errorf("build request: %w", err)
		}
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+c.Token)
		req.Header.Set("User-Agent", "compass-daemon/"+version)

		resp, err := c.HTTP.Do(req)
		if err != nil {
			lastErr = fmt.Errorf("attempt %d: %w", attempt+1, err)
			continue
		}

		// Drena o body pra reutilizar conexão
		respBody, _ := io.ReadAll(resp.Body)
		resp.Body.Close()

		if resp.StatusCode >= 200 && resp.StatusCode < 300 {
			return nil
		}

		// 401/403/422 = erro do cliente, não vale retentar
		if resp.StatusCode == 401 || resp.StatusCode == 403 || resp.StatusCode == 422 {
			return fmt.Errorf("backend rejected (status %d): %s", resp.StatusCode, truncStr(string(respBody), 200))
		}

		lastErr = fmt.Errorf("attempt %d: status %d: %s", attempt+1, resp.StatusCode, truncStr(string(respBody), 200))
	}

	return lastErr
}

func truncStr(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max] + "..."
}
