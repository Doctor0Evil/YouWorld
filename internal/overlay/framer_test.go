package overlay

import (
	"bytes"
	"encoding/json"
	"testing"
	"time"
)

func TestFrameBatch_JSONFraming(t *testing.T) {
	v := NewDefaultValidator()
	nowMs := uint64(time.Now().UnixNano() / int64(time.Millisecond))
	events := []OverlayEvent{{StreamID: "s1", EventID: "e1", PresentationTsMs: nowMs + 100, Sequence: 1, SchemaVersion: "overlay-1.0.0"}}

	frame, err := FrameBatch(events, v, &JSONBatchMarshaller{})
	if err != nil { t.Fatalf("frame error: %v", err) }

	if len(frame) < 2 { t.Fatalf("frame too small: %d", len(frame)) }
	if frame[0] != WireVersionV1 { t.Fatalf("expected header 0x01, got 0x%02x", frame[0]) }

	// The rest should be JSON equal to marshaled events
	payload := frame[1:]
	var out []OverlayEvent
	if err := json.Unmarshal(payload, &out); err != nil { t.Fatalf("json unmarshal error: %v", err) }
	if len(out) != 1 || out[0].EventID != "e1" { t.Fatalf("unexpected payload content: %v", out) }
}

func TestFrameBatch_ValidationFailure(t *testing.T) {
	v := NewDefaultValidator()
	nowMs := uint64(time.Now().UnixNano() / int64(time.Millisecond))
	// Missing StreamID
	events := []OverlayEvent{{EventID: "e1", PresentationTsMs: nowMs + 100, Sequence: 1, SchemaVersion: "overlay-1.0.0"}}

	_, err := FrameBatch(events, v, &JSONBatchMarshaller{})
	if err == nil { t.Fatalf("expected validation error, got nil") }
}
