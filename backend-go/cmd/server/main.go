package main

import (
	"log"

	"lunchbox/backend-go/internal/app"
	"lunchbox/backend-go/internal/config"
)

func main() {
	cfg := config.Load()
	server, err := app.NewServer(cfg)
	if err != nil {
		log.Fatalf("create server: %v", err)
	}

	log.Printf("Starting Lunchbox Go backend on %s", cfg.Addr)
	if err := server.ListenAndServe(); err != nil {
		log.Fatalf("serve: %v", err)
	}
}
