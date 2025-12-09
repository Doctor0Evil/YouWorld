package overlay

import (
	"testing"
	"time"
)

func TestValidator_ValidateEvent(t *testing.T) {
	v := NewDefaultValidator()
	nowMs := uint64(time.Now().UnixNano() / int64(time.Millisecond))
	valid := OverlayEvent{StreamID: "s1", EventID: "e1", SchemaVersion: "overlay-1.0.0", PresentationTsMs: nowMs + 100, Sequence: 1}
	if err := v.ValidateEvent(&valid); err != nil {
		t.Fatalf("expected valid event, got %v", err)
	}

	missing := OverlayEvent{EventID: "e2", SchemaVersion: "overlay-1.0.0", PresentationTsMs: nowMs + 100}
	if err := v.ValidateEvent(&missing); err == nil {
		t.Fatalf("expected missing stream id error")
	}

	badRef := OverlayEvent{StreamID: "s1", EventID: "e3", SchemaVersion: "overlay-1.0.0", PresentationTsMs: nowMs + 100, PayloadRef: "!bad$ref"}
	if err := v.ValidateEvent(&badRef); err == nil {
		t.Fatalf("expected invalid payload_ref error")
	}
}

func TestValidator_ValidateBatch(t *testing.T) {
	v := NewDefaultValidator()
	nowMs := uint64(time.Now().UnixNano() / int64(time.Millisecond))
	batch := []OverlayEvent{
		{StreamID: "s1", EventID: "e1", SchemaVersion: "overlay-1.0.0", PresentationTsMs: nowMs + 50, Sequence: 1},
		{StreamID: "s1", EventID: "e2", SchemaVersion: "overlay-1.0.0", PresentationTsMs: nowMs + 150, Sequence: 2},
	}
	if err := v.ValidateBatch(batch); err != nil {
		t.Fatalf("expected valid batch, got %v", err)
	}
}
