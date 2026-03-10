package config

import (
	"os"
	"path/filepath"
	"strings"
)

type Config struct {
	Addr           string
	DataDir        string
	DBPath         string
	SkipSeed       bool
	AllowedOrigins []string
}

func Load() Config {
	root, err := filepath.Abs(filepath.Join(".."))
	if err != nil {
		root = ".."
	}

	dataDir := filepath.Join(root, "data")
	dbPath := os.Getenv("LUNCHBOX_DB_PATH")
	if dbPath == "" {
		dbPath = filepath.Join(dataDir, "lunchbox.db")
	}

	return Config{
		Addr:           envOrDefault("LUNCHBOX_ADDR", "127.0.0.1:8000"),
		DataDir:        dataDir,
		DBPath:         dbPath,
		SkipSeed:       os.Getenv("LUNCHBOX_SKIP_SEED") != "",
		AllowedOrigins: allowedOrigins(),
	}
}

func envOrDefault(key string, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}

func allowedOrigins() []string {
	value := os.Getenv("LUNCHBOX_ALLOWED_ORIGINS")
	if value == "" {
		return []string{
			"http://localhost:5173",
			"http://127.0.0.1:5173",
		}
	}

	parts := strings.Split(value, ",")
	origins := make([]string, 0, len(parts))
	for _, part := range parts {
		origin := strings.TrimSpace(part)
		if origin != "" {
			origins = append(origins, origin)
		}
	}
	return origins
}
