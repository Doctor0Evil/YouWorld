//go:build protogen
// +build protogen

package overlay

import (
    "context"
    "crypto/tls"
    "crypto/x509"
    "io"
    "net"
    "net/http"
    "os"
    "testing"
    "time"

    wt "github.com/quic-go/webtransport-go"
    pb "github.com/Doctor0Evil/YouWorld/gen/overlaypb"
    "google.golang.org/protobuf/proto"
    "github.com/quic-go/quic-go/http3"
)

func TestWebTransport_EndToEnd_Protogen(t *testing.T) {
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

    go func() {
        if err := srv.RunWebTransport(certFile, keyFile); err != nil {
            t.Fatalf("run webtransport failed: %v", err)
        }
    }()

    // Wait for server start
    time.Sleep(250 * time.Millisecond)

    clientTLS := &tls.Config{InsecureSkipVerify: true}
    cliSess, err := wt.Dial(context.Background(), "https://"+addr+"/overlay/wt", &wt.DialOptions{TLSClientConfig: clientTLS})
    if err != nil { t.Fatalf("dial failed: %v", err) }
    defer cliSess.CloseWithError(0, "bye")

    // Open uni-stream for receiving ticks
    stream, err := cliSess.OpenUniStreamSync(context.Background())
    if err != nil { t.Fatalf("open stream failed: %v", err) }
    defer stream.Close()

    nowMs := uint64(time.Now().UnixNano() / int64(time.Millisecond))
    srv.buffer.Add(OverlayEvent{StreamID: "s1", EventID: "e1", PresentationTsMs: nowMs + 10, Sequence: 1, Priority: PriorityNormal, SchemaVersion: "overlay-1.0.0"})

    buf := make([]byte, 65536)
    n, err := stream.Read(buf)
    if err != nil && err != io.EOF {
        t.Fatalf("read error: %v", err)
    }
    if n == 0 { t.Fatalf("no data read from stream") }
    if buf[0] != WireVersionV1 {
        t.Fatalf("expected wire header 0x01, got 0x%02x", buf[0])
    }
    var batch pb.OverlayEventBatch
    if err := proto.Unmarshal(buf[1:n], &batch); err != nil {
        t.Fatalf("proto unmarshal: %v", err)
    }
    if batch.StreamId != "s1" || len(batch.Events) != 1 || batch.Events[0].EventId != "e1" {
        t.Fatalf("unexpected proto payload: %v", batch)
    }
}
