package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

// StatsCache mirrors the schema of ~/.claude/stats-cache.json that Claude Code persists locally.
type StatsCache struct {
	Version                 int                  `json:"version"`
	LastComputedDate        string               `json:"lastComputedDate"`
	DailyActivity           []DailyActivity      `json:"dailyActivity"`
	DailyModelTokens        []DailyModelTokens   `json:"dailyModelTokens"`
	ModelUsage              map[string]ModelStat `json:"modelUsage"`
	TotalSessions           int                  `json:"totalSessions"`
	TotalMessages           int                  `json:"totalMessages"`
	LongestSession          map[string]any       `json:"longestSession"`
	FirstSessionDate        string               `json:"firstSessionDate"`
	HourCounts              map[string]int       `json:"hourCounts"`
	TotalSpeculationTimeMs  int64                `json:"totalSpeculationTimeSavedMs"`
}

type DailyActivity struct {
	Date          string `json:"date"`
	MessageCount  int    `json:"messageCount"`
	SessionCount  int    `json:"sessionCount"`
	ToolCallCount int    `json:"toolCallCount"`
}

type DailyModelTokens struct {
	Date          string         `json:"date"`
	TokensByModel map[string]int `json:"tokensByModel"`
}

type ModelStat struct {
	InputTokens             int64   `json:"inputTokens"`
	OutputTokens            int64   `json:"outputTokens"`
	CacheReadInputTokens    int64   `json:"cacheReadInputTokens"`
	CacheCreationInputTokens int64  `json:"cacheCreationInputTokens"`
	WebSearchRequests       int     `json:"webSearchRequests"`
	CostUSD                 float64 `json:"costUSD"`
	ContextWindow           int     `json:"contextWindow"`
	MaxOutputTokens         int     `json:"maxOutputTokens"`
}

// claudeStatsPath returns the absolute path of stats-cache.json on the current OS.
func claudeStatsPath() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("user home dir: %w", err)
	}
	return filepath.Join(home, ".claude", "stats-cache.json"), nil
}

// readStatsCache parses the local stats-cache.json file.
func readStatsCache(path string) (*StatsCache, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, fmt.Errorf("open %s: %w", path, err)
	}
	defer f.Close()

	var stats StatsCache
	if err := json.NewDecoder(f).Decode(&stats); err != nil {
		return nil, fmt.Errorf("decode json: %w", err)
	}
	return &stats, nil
}
