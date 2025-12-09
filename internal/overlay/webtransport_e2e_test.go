//go:build !protogen
// +build !protogen

package overlay

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"io"
	"math/big"
	"net"
	"net/http"
	"os"
	"testing"
	"time"

	wt "github.com/quic-go/webtransport-go"
	"github.com/quic-go/quic-go/http3"
)

func generateSelfSignedTLSFiles(t *testing.T, host string) (certFile, keyFile string) {
	t.Helper()
	certFile, _ = os.CreateTemp("", "cert-*.pem")
	keyFile, _ = os.CreateTemp("", "key-*.pem")
	certFile.Close()
	keyFile.Close()
	if err := GenerateSelfSignedCert(certFile.Name(), keyFile.Name(), host); err != nil {
		t.Fatalf("generate cert: %v", err)
	}
	return certFile.Name(), keyFile.Name()
}

// Note: Due to complexities of generating certs and the webtransport client, this test uses a simplified connection
// where we instantiate a webtransport.Server and use a client with TLS config that skips verification for local test.
func TestWebTransport_EndToEnd(t *testing.T) {
	// Pick a free port
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

	tlsCert, err := tls.LoadX509KeyPair(certFile, keyFile)
	if err != nil { t.Fatalf("load cert: %v", err) }
	caCert := tlsCert.Certificate[0]
	root := x509.NewCertPool()
	root.AppendCertsFromPEM(pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: caCert}))

	tlsCfg := &tls.Config{Certificates: []tls.Certificate{tlsCert}, ClientAuth: tls.NoClientCert}

	go func() {
		if err := srv.RunWebTransport(certFile, keyFile); err != nil {
			t.Fatalf("run webtransport failed: %v", err)
		}
	}()

	// Wait for server start
	time.Sleep(250 * time.Millisecond)

	clientTLS := &tls.Config{InsecureSkipVerify: true, RootCAs: root}
	cliSess, err := wt.Dial(context.Background(), "https://"+addr+"/overlay/wt", &wt.DialOptions{TLSClientConfig: clientTLS})
	if err != nil { t.Fatalf("dial failed: %v", err) }
	defer cliSess.CloseWithError(0, "bye")

	// Open uni-stream for receiving ticks
	stream, err := cliSess.OpenUniStreamSync(context.Background())
	if err != nil { t.Fatalf("open stream failed: %v", err) }
	defer stream.Close()

	// Send a valid event into server buffer
	nowMs := uint64(time.Now().UnixNano() / int64(time.Millisecond))
	srv.buffer.Add(OverlayEvent{StreamID: "s1", EventID: "e1", PresentationTsMs: nowMs + 10, Sequence: 1, Priority: PriorityNormal, SchemaVersion: "overlay-1.0.0"})

	// Read incoming framed data
	buf := make([]byte, 4096)
	n, err := stream.Read(buf)
	if err != nil && err != io.EOF {
		t.Fatalf("read error: %v", err)
	}
	if n == 0 { t.Fatalf("no data read from stream") }
	if buf[0] != WireVersionV1 {
		t.Fatalf("expected wire header 0x01, got 0x%02x", buf[0])
	}
	// Parse payload JSON
	var out []OverlayEvent
	if err := json.Unmarshal(buf[1:n], &out); err != nil {
		t.Fatalf("json unmarshal: %v", err)
	}
	if len(out) != 1 || out[0].EventID != "e1" {
		t.Fatalf("unexpected payload content: %v", out)
	}
}
