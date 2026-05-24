package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"
)

// Snapshot é o estado consolidado que persistimos pra calcular deltas entre execuções.
type Snapshot struct {
	TakenAt          time.Time              `json:"taken_at"`
	StatsCacheHash   string                 `json:"stats_cache_hash"`
	ModelTotals      map[string]ModelTotals `json:"model_totals"`
	DailyMessages    map[string]int         `json:"daily_messages"`     // YYYY-MM-DD -> count
	DailySessions    map[string]int         `json:"daily_sessions"`
	DailyToolCalls   map[string]int         `json:"daily_tool_calls"`
	DailyTokensBy    map[string]map[string]int `json:"daily_tokens_by_model"` // date -> model -> tokens
}

type ModelTotals struct {
	InputTokens             int64   `json:"input_tokens"`
	OutputTokens            int64   `json:"output_tokens"`
	CacheReadInputTokens    int64   `json:"cache_read_tokens"`
	CacheCreationInputTokens int64  `json:"cache_create_tokens"`
	WebSearchRequests       int     `json:"web_search_requests"`
	CostUSD                 float64 `json:"cost_usd_estimated"`
}

// snapshotPath returns ~/.compass/last_snapshot.json
func snapshotPath() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	dir := filepath.Join(home, ".compass")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", fmt.Errorf("create %s: %w", dir, err)
	}
	return filepath.Join(dir, "last_snapshot.json"), nil
}

// buildSnapshot extracts a normalized snapshot from raw stats-cache data.
func buildSnapshot(stats *StatsCache) *Snapshot {
	s := &Snapshot{
		TakenAt:        time.Now().UTC(),
		ModelTotals:    map[string]ModelTotals{},
		DailyMessages:  map[string]int{},
		DailySessions:  map[string]int{},
		DailyToolCalls: map[string]int{},
		DailyTokensBy:  map[string]map[string]int{},
	}

	for name, m := range stats.ModelUsage {
		s.ModelTotals[name] = ModelTotals{
			InputTokens:              m.InputTokens,
			OutputTokens:             m.OutputTokens,
			CacheReadInputTokens:     m.CacheReadInputTokens,
			CacheCreationInputTokens: m.CacheCreationInputTokens,
			WebSearchRequests:        m.WebSearchRequests,
			CostUSD: costUSD(
				name,
				m.InputTokens,
				m.OutputTokens,
				m.CacheReadInputTokens,
				m.CacheCreationInputTokens,
			),
		}
	}

	for _, d := range stats.DailyActivity {
		s.DailyMessages[d.Date] = d.MessageCount
		s.DailySessions[d.Date] = d.SessionCount
		s.DailyToolCalls[d.Date] = d.ToolCallCount
	}

	for _, d := range stats.DailyModelTokens {
		copyMap := make(map[string]int, len(d.TokensByModel))
		for k, v := range d.TokensByModel {
			copyMap[k] = v
		}
		s.DailyTokensBy[d.Date] = copyMap
	}

	return s
}

// loadPrevious returns the previously persisted snapshot, or nil if none exists.
func loadPrevious() (*Snapshot, error) {
	path, err := snapshotPath()
	if err != nil {
		return nil, err
	}
	f, err := os.Open(path)
	if os.IsNotExist(err) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	defer f.Close()
	var prev Snapshot
	if err := json.NewDecoder(f).Decode(&prev); err != nil {
		return nil, fmt.Errorf("decode previous snapshot: %w", err)
	}
	return &prev, nil
}

// persist writes the snapshot to ~/.compass/last_snapshot.json
func persist(s *Snapshot) error {
	path, err := snapshotPath()
	if err != nil {
		return err
	}
	f, err := os.Create(path)
	if err != nil {
		return err
	}
	defer f.Close()
	enc := json.NewEncoder(f)
	enc.SetIndent("", "  ")
	return enc.Encode(s)
}

// Delta represents the diff between two snapshots.
type Delta struct {
	From     time.Time         `json:"from"`
	To       time.Time         `json:"to"`
	ByModel  map[string]ModelTotals `json:"by_model_delta"`
	TotalCost float64          `json:"total_cost_delta_usd"`
}

// diff computes prev → curr delta.
// If prev is nil, treats curr as the entire delta (first run).
func diff(prev, curr *Snapshot) *Delta {
	d := &Delta{
		To:      curr.TakenAt,
		ByModel: map[string]ModelTotals{},
	}
	if prev != nil {
		d.From = prev.TakenAt
	}

	for model, cur := range curr.ModelTotals {
		var prevMT ModelTotals
		if prev != nil {
			if p, ok := prev.ModelTotals[model]; ok {
				prevMT = p
			}
		}
		deltaMT := ModelTotals{
			InputTokens:              cur.InputTokens - prevMT.InputTokens,
			OutputTokens:             cur.OutputTokens - prevMT.OutputTokens,
			CacheReadInputTokens:     cur.CacheReadInputTokens - prevMT.CacheReadInputTokens,
			CacheCreationInputTokens: cur.CacheCreationInputTokens - prevMT.CacheCreationInputTokens,
			WebSearchRequests:        cur.WebSearchRequests - prevMT.WebSearchRequests,
		}
		deltaMT.CostUSD = costUSD(
			model,
			deltaMT.InputTokens,
			deltaMT.OutputTokens,
			deltaMT.CacheReadInputTokens,
			deltaMT.CacheCreationInputTokens,
		)
		if deltaMT.InputTokens != 0 || deltaMT.OutputTokens != 0 ||
			deltaMT.CacheReadInputTokens != 0 || deltaMT.CacheCreationInputTokens != 0 {
			d.ByModel[model] = deltaMT
			d.TotalCost += deltaMT.CostUSD
		}
	}
	return d
}
