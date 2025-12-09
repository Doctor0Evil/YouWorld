package overlay

import (
	"bytes"
	"encoding/json"
	"net/http"
	"testing"
	"time"

	"github.com/gorilla/websocket"
	"github.com/posener/wstest"
)

func TestWSOverlayStream(t *testing.T) {
	server := NewServer(":0")
	// Use wstest to serve the handler directly
	h := http.HandlerFunc(server.handleWS)
	wsSrv := wstest.NewServer(h)
	defer wsSrv.Close()

	// Dial client
	url := wsSrv.URL + "/overlay/ws"
	dialer := websocket.DefaultDialer
	conn, _, err := dialer.Dial(url, nil)
	if err != nil {
		t.Fatalf("dial error: %v", err)
	}
	defer conn.Close()

	// Send a simple JSON message; server reads but doesn't parse
	m := map[string]string{"event": "demo"}
	b, _ := json.Marshal(m)
	err = conn.WriteMessage(websocket.TextMessage, b)
	if err != nil { t.Fatalf("write error: %v", err) }

	// Create a valid event and send JSON over the WS, then expect broadcast
	nowMs := uint64(time.Now().UnixNano() / int64(time.Millisecond))
	evt := OverlayEvent{StreamID: "s1", EventID: "ev1", PresentationTsMs: nowMs + 1, Sequence: 1, Priority: PriorityNormal, SchemaVersion: "overlay-1.0.0"}
	b, _ := json.Marshal([]OverlayEvent{evt})
	if err := conn.WriteMessage(websocket.TextMessage, b); err != nil {
		t.Fatalf("write error: %v", err)
	}

	// Wait for server to broadcast (broadcast loop ticks every 50ms)
	conn.SetReadDeadline(time.Now().Add(500 * time.Millisecond))
	// Read the JSON broadcast first to keep behavior
	_, message, err := conn.ReadMessage()
	if err != nil {
		t.Fatalf("read error: %v", err)
	}

	// Expect to receive JSON array of events (broadcast uses JSON currently)
	if !bytes.HasPrefix(message, []byte("[")) {
		t.Fatalf("expected JSON array, got %s", string(message))
	}

	// Also ensure we receive binary framed payload; server broadcasts both JSON and framed bytes
	_, bmsg, err := conn.ReadMessage()
	if err != nil {
		t.Fatalf("read binary message err: %v", err)
	}
	if bmsg[0] != WireVersionV1 { t.Fatalf("expected wire header 0x01, got 0x%02x", bmsg[0]) }
}
