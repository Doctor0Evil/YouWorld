package main

import (
	"context"
	"flag"
	"log"
	"time"
	"os"
	"os/signal"
	"syscall"

	"github.com/Doctor0Evil/YouWorld/internal/overlay"
)

func main() {
	addr := flag.String("addr", ":8080", "server listen address")
	flag.Parse()

	srv := overlay.NewServer(*addr)

	// Bind a simple metrics sink that logs marshalling latency and kind for demo and CI visibility.
	overlay.SetMarshallerMetricsSink(func(kind string, dur time.Duration) {
		log.Printf("marshal kind=%s dur_ns=%d", kind, dur.Nanoseconds())
	})

	// Run server in goroutine; enable WebTransport (HTTP/3) if certs are provided
	go func() {
		// If cert files exist, start WebTransport-enabled HTTP/3 server; otherwise fallback to HTTP
		certFile := "cert.pem"
		keyFile := "key.pem"
		if _, err := os.Stat(certFile); os.IsNotExist(err) {
			// generate self-signed into a temp path
			if err := generateSelfSignedCert(certFile, keyFile, "localhost"); err != nil {
				log.Printf("failed to generate cert: %v; falling back to HTTP listener", err)
				if err := srv.Run(); err != nil { log.Fatalf("server run failed: %v", err) }
				return
			}
		}
		// Launch on HTTP3/WebTransport
		log.Printf("overlay server starting on %s (WebTransport enabled)", *addr)
		if err := srv.RunWebTransport(certFile, keyFile); err != nil {
			log.Fatalf("server webtransport run failed: %v", err)
		}
	}()

	// Wait for shutdown signal
	sigc := make(chan os.Signal, 1)
	signal.Notify(sigc, syscall.SIGINT, syscall.SIGTERM)
	<-sigc

	log.Print("shutting down server...")
	_ = srv.Stop(context.Background())
}
