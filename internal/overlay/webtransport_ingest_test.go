package overlay

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"net"
	"net/http"
	"os"
	"testing"
	"time"

	wt "github.com/quic-go/webtransport-go"
	"github.com/quic-go/quic-go/http3"
)

func TestWebTransport_IngestJSON(t *testing.T) {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil { t.Fatalf("listen failed: %v", err) }
	addr := ln.Addr().String()
	ln.Close()

	srv := NewServer(addr)
	mux := http.NewServeMux()
	mux.HandleFunc("/overlay/ws", srv.handleWS)
	mux.HandleFunc("/overlay/wt", srv.handleWT)

	certFile, keyFile := generateSelfSignedTLSFiles(t, "localhost")
	defer os.Remove(certFile)
	defer os.Remove(keyFile)

	// Setup TLS config: use cert for server and set client to skip verification
	tlsCert, err := tls.LoadX509KeyPair(certFile, keyFile)
	if err != nil { t.Fatalf("load cert: %v", err) }
	serverTlsCfg := &tls.Config{Certificates: []tls.Certificate{tlsCert}}

	wtSrv := wt.Server{H3: http3.Server{Addr: addr, TLSConfig: serverTlsCfg, Handler: mux}}
	go func() { _ = wtSrv.ListenAndServeTLS(certFile, keyFile) }()
	// Allow server to start
	time.Sleep(250 * time.Millisecond)

	cliTlsCfg := &tls.Config{InsecureSkipVerify: true}
	sess, err := wt.Dial(context.Background(), "https://"+addr+"/overlay/wt", &wt.DialOptions{TLSClientConfig: cliTlsCfg})
	if err != nil { t.Fatalf("wt client dial failed: %v", err) }
	defer sess.CloseWithError(0, "bye")

	// Create a bidi stream and send JSON batch
	stream, err := sess.OpenStreamSync(context.Background())
	if err != nil { t.Fatalf("open stream failed: %v", err) }
	// Build events
	nowMs := uint64(time.Now().UnixNano() / int64(time.Millisecond))
	events := []OverlayEvent{{StreamID: "ns", EventID: "e1", PresentationTsMs: nowMs + 50, Sequence: 1, SchemaVersion: "overlay-1.0.0"}}
	b, _ := json.Marshal(events)
	if _, err := stream.Write(b); err != nil { t.Fatalf("write stream error: %v", err) }
	_ = stream.Close()

	// Wait for server to process
	time.Sleep(200 * time.Millisecond)

	if srv.buffer.Len() == 0 { t.Fatalf("expected buffer to have events after ingest, got %d", srv.buffer.Len()) }
}
